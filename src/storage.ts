import { existsSync, mkdir as mkdirC, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { env } from 'node:process'
import { log } from 'node:console'
import * as vscode from 'vscode'
import type { TraceData } from '../shared/src/traceData'
import { traceData } from '../shared/src/traceData'
import { postMessage } from './webview'
import { sendTraceDir } from './commands'
import { setStatusBarState } from './statusBar'
import { confirmTraceCommand, getCurrentConfig } from './configuration'

// TODO: track creation of directories to avoid excess mkdir calls

const mkdir = promisify(mkdirC)

const saveNames: string[] = []
const projectNames: string[] = []
let saveName = ''
let projectName = 'Not Named'
let attemptedGetProjectName = false

async function getProjectName() {
  if (attemptedGetProjectName)
    return projectName
  attemptedGetProjectName = true

  try {
    const packageStr = readFileSync(join(getWorkspacePath(), 'package.json'), { encoding: 'utf8' })
    const json = JSON.parse(packageStr)
    if ('name' in json && typeof json.name === 'string')
      projectName = json.name
  }
  catch (_e) {
  /* */
  }

  return projectName
}

export function sendStorageMeta() {
  postMessage({ message: 'projectNames', names: projectNames })
  postMessage({ message: 'saveNames', names: saveNames })
  postMessage({ message: 'projectOpen', name: projectName })
  postMessage({ message: 'saveOpen', name: saveName })
}

export async function openSave(name: string) {
  if (!saveNames.includes(name))
    saveNames.push(name)
  if (name === saveName)
    return

  saveName = name
  setStoredConfig({ saveName })
  setStatusBarState('saveName', saveName)

  const traceDir = await getTraceDir()
  mkdir(traceDir, { recursive: true })

  sendStorageMeta()
  void sendTraceDir(traceDir)
}

export async function openProject(name: string) {
  if (!projectNames.includes(name))
    projectNames.push(name)
  projectName = name
  setStatusBarState('projectName', projectName)
  const projectPath = await getProjectPath()
  mkdir(projectPath, { recursive: true })

  const config = await getStoredConfig()
  if (!config.hasSetTraceCommand)
    confirmTraceCommand().then(() => setStoredConfig({ hasSetTraceCommand: true }))

  if (config.saveName)
    saveName = config.saveName

  const files = readdirSync(projectPath)
  for (const file of files) {
    const savePath = join(projectPath, file)
    const stat = statSync(savePath)
    if (stat.isDirectory()) {
      if (!saveNames.includes(file)) {
        saveNames.push(file)
        mkdir(savePath, { recursive: true })
      }
      // TODO: check for project config file, particularly to get the last used save name
    }
  }

  openSave(saveName)
}

let context: vscode.ExtensionContext
export async function initStorage(extensionContext: vscode.ExtensionContext) {
  context = extensionContext

  const projectName = await getProjectName()
  openProject(projectName)
}

export async function getProjectPath() {
  const storagePath = context.globalStorageUri.fsPath
  const projectPath = join(storagePath, await getProjectName())
  await mkdir(projectPath, { recursive: true })
  return projectPath
}

export async function getSavePath() {
  const savePath = join(await getProjectPath(), saveName)
  await mkdir(savePath, { recursive: true })
  return savePath
}

export type StoredConfig =
  ReturnType<typeof getCurrentConfig> & {
    hasSetTraceCommand: boolean
    saveName: string
  }

async function getConfigPath() {
  return join(await getProjectPath(), 'tracer.config.json')
}

async function writeStoredConfig(config: StoredConfig) {
  const configPath = await getConfigPath()

  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2))
  }
  catch (e) {
    vscode.window.showErrorMessage('Could not write tracer configuration file for project')
    log(`${e}`)
  }
}

export async function getStoredConfig(): Promise<StoredConfig> {
  const configPath = await getConfigPath()
  if (!existsSync(configPath)) {
    const storedConfig = { ...getCurrentConfig(), hasSetTraceCommand: false, saveName: 'default' }
    writeStoredConfig(storedConfig)
    return storedConfig
  }

  const configString = readFileSync(configPath, { encoding: 'utf8' })
  // TODO:validator for stored config
  const json = JSON.parse(configString) as StoredConfig
  return json
}

async function setStoredConfig(config: Partial<StoredConfig>) {
  const newConfig = { ...(await getStoredConfig()), ...config }
  writeStoredConfig(newConfig)
}

export async function getTraceDir() {
  const traceDir = join(await getSavePath(), 'traces')
  await mkdir(traceDir, { recursive: true })
  return traceDir
}

export function getWorkspacePath(): string {
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath
  if (!workspacePath) {
    vscode.window.showErrorMessage('Could not determine project path')
    throw new Error('Could not determine workspace path')
  }
  return workspacePath
}

const terminalName = 'Tracer Storage'
export async function openTerminal(): Promise<vscode.Terminal> {
  let terminal = vscode.window.terminals.find(x => x.name === terminalName)
  if (terminal) {
    terminal.show()
    return terminal
  }
  const projectPath = await getProjectPath()
  await mkdir(projectPath, { recursive: true })
  terminal = vscode.window.createTerminal({ cwd: projectPath, name: terminalName })
  terminal.show()

  return terminal
}

let traceFiles: Record<string, TraceData> = {}
export function addTraceFile(fileName: string, contents: string) {
  try {
    const json = JSON.parse(contents)

    const arr = traceData.safeParse(json)
    if (!arr.success)
      return

    traceFiles[fileName] = arr.data
  }
  catch (e) {
    vscode.window.showErrorMessage(`${e}`)
  }
}

export function clearTraceFiles() {
  traceFiles = {}
}

export function getTraceFiles() {
  return traceFiles
}

// allow setting this in the debugger
// set it to the full path of devUiDriver/commands.ts to record for driver playback
// eslint-disable-next-line prefer-const
let logMessagesFileName = env.TracerLogMessages

let lastMessageTrigger: any
export function setLastMessageTrigger(trigger: any) {
  lastMessageTrigger = trigger
}

let logMessagesStarted = false
export const logMessage = logMessagesFileName
  ? (message: any) => {
      if (!logMessagesStarted) {
        writeFileSync(logMessagesFileName, 'export const commands = [\n', { flag: 'w' })
        logMessagesStarted = true
      }
      const s = `${JSON.stringify({ trigger: lastMessageTrigger, response: message }, null, 2)},\n`
      writeFileSync(logMessagesFileName, s, { flag: 'a' })
    }
  : () => {
    /* do nothing */
    }
