import { RubyVM } from "@ruby/wasm-wasi";
import { WASI } from "wasi";
import fs from "fs/promises";
import { PGLite4Rails } from "./database.js";

const rubyWasm = new URL("../node_modules/@rails-tutorial/wasm/dist/rails.wasm", import.meta.url).pathname;

// Rails directories to mount
const RAILS_DIRECTORIES = ['app', 'bin', 'config', 'db', 'log', 'public', 'storage', 'test'];

// Rails files to mount individually
const RAILS_FILES = ['config.ru', 'Gemfile', 'Rakefile'];

const railsRootDir = new URL("../", import.meta.url).pathname;
// Store pgdata in node_modules, so Bolt doesn't break trying to display it (?)
const pgDataDir = new URL("../node_modules/pgdata", import.meta.url).pathname;
const railsRootPreopenDir = new URL("../node_modules/_rails", import.meta.url).pathname;

export default async function initVM(vmopts = {}) {
  const { args, skipRails } = vmopts;
  const env = vmopts.env || {};
  const binary = await fs.readFile(rubyWasm);
  const module = await WebAssembly.compile(binary);

  const RAILS_ENV = env.RAILS_ENV || process.env.RAILS_ENV;
  if (RAILS_ENV) env.RAILS_ENV = RAILS_ENV;

  const workspaceDir = new URL("../", import.meta.url).pathname;
  const workdir = process.cwd().startsWith(workspaceDir) ?
    `/rails${process.cwd().slice(workspaceDir.length)}` :
    "/rails";

  const cliArgs = args?.length ? ['ruby.wasm'].concat(args) : undefined;

  // Build preopens for Rails directories.
  // First, create a root folder. We must preopen it.
  // We use an empty folder created on the fly for that.
  try {
    
    await fs.mkdir(railsRootPreopenDir, { recursive: true });
  } catch (error) {
    console.log(error)
  }
  
  const preopens = {
    '/rails': railsRootPreopenDir
  };

  for (const dir of RAILS_DIRECTORIES) {
    preopens[`/rails/${dir}`] = `${workspaceDir}${dir}`;
  }

  const wasi = new WASI(
    {
      env: {"RUBYOPT": "-EUTF-8 -W0", ...env},
      version: "preview1",
      returnOnExit: true,
      preopens,
      args: cliArgs
    }
  );


  const { vm } = await RubyVM.instantiateModule({
    module,
    wasip1: wasi,
    args: cliArgs
  });

  vm.eval(`
    
  `)

  for (const file of RAILS_FILES) {
    try {
      const content = await fs.readFile(`${workspaceDir}${file}`);
      vm.eval(`
        File.write('/rails/${file}', ${JSON.stringify(content.toString())})
      `);
    } catch (error) {
      console.error('failed to mount a file', file, error)
    }
  }

  if (!skipRails) {
    const pglite = new PGLite4Rails(pgDataDir);
    global.pglite = pglite;

    const authenticationPatch = await fs.readFile(new URL("./patches/authentication.rb", import.meta.url).pathname, 'utf8');

    vm.eval(` 
      Dir.chdir("${workdir}") unless "${workdir}".empty?

      # Create tmp/ directory
      Dir.mkdir("tmp") unless Dir.exist?("tmp")

      ENV["RACK_HANDLER"] = "wasi"

      require "/rails-vm/boot"

      # TODO: It's not loaded in "rails test" for some reason
      require "pathname"

      require "js"

      Wasmify::ExternalCommands.register(:server, :console)

      ${authenticationPatch}
    `)
  }

  return vm;
}
