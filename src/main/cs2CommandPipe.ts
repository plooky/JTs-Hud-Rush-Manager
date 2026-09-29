import net, { Server, Socket } from 'net'

export const COMMAND_PIPE = String.raw`\\.\pipe\jts_hud_rush_cmd`
export const OUTPUT_PIPE = String.raw`\\.\pipe\jts_hud_rush_out`
export const COMMAND_PIPE_LAUNCH_OPTIONS =
  `-insecure -concommandpipe ${COMMAND_PIPE},${OUTPUT_PIPE}`

let commandServer: Server | null = null
let outputServer: Server | null = null
let commandSocket: Socket | null = null
const outputSockets = new Set<Socket>()

const createPipeServer = (pipePath: string, onConnection: (socket: Socket) => void): Server => {
  const server = net.createServer(onConnection)
  server.on('error', (error) => {
    console.error(`[CS2 Command Pipe] ${pipePath}:`, error)
  })
  server.listen(pipePath)
  return server
}

export const startCommandPipes = (): void => {
  if (process.platform !== 'win32' || commandServer || outputServer) return

  commandServer = createPipeServer(COMMAND_PIPE, (socket) => {
    commandSocket?.destroy()
    commandSocket = socket
    socket.on('close', () => {
      if (commandSocket === socket) commandSocket = null
    })
    socket.on('error', () => {
      if (commandSocket === socket) commandSocket = null
    })
  })

  outputServer = createPipeServer(OUTPUT_PIPE, (socket) => {
    outputSockets.add(socket)
    socket.on('close', () => outputSockets.delete(socket))
    socket.on('data', () => undefined)
    socket.on('error', () => undefined)
  })
}

export const sendCommandPipe = async (command: string): Promise<void> => {
  if (!commandSocket?.writable) {
    throw new Error('CS2 is not connected to the command pipe')
  }

  const lines = command
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length) throw new Error('No console command was provided')

  await new Promise<void>((resolve, reject) => {
    commandSocket!.write(`${lines.join('\n')}\n`, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

export const stopCommandPipes = async (): Promise<void> => {
  commandSocket?.destroy()
  commandSocket = null
  for (const socket of outputSockets) socket.destroy()
  outputSockets.clear()
  const servers = [commandServer, outputServer].filter((server): server is Server => !!server)
  commandServer = null
  outputServer = null
  await Promise.all(
    servers.map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve())
        })
    )
  )
}
