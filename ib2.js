const cp = require("child_process");
const path = require("path");
const tmp = require("tmp");
const fs = require("fs");

/**
 * @param {String} src
 */
module.exports = (src) => {
    return new Promise((resolve, reject) => {
        // Input = Inputted file by user
        const input = tmp.fileSync({ suffix: '.lua' });
        const output = tmp.fileSync({ suffix: '.lua' });
        // Output = Obfuscated file returned by IronBrew

        fs.writeFileSync(input.name, src);
        
        // Path ke IronBrew2 CLI.dll - FIXED!
        const ironbrewDll = path.join(__dirname, "Ib2", "Source", "IronBrew2 CLI.dll");
        const ironbrewCwd = path.join(__dirname, "Ib2", "Source");

        console.log("IronBrew2 DLL:", ironbrewDll);
        console.log("IronBrew2 CWD:", ironbrewCwd);
        console.log("DLL exists:", fs.existsSync(ironbrewDll));

        if (!fs.existsSync(ironbrewDll)) {
            return reject(new Error("IronBrew2 CLI.dll not found at: " + ironbrewDll));
        }

        // Spawns a process for IronBrew Client dll and parses the file name and output name
        const process = cp.spawn("dotnet", [ironbrewDll, input.name, output.name], {
            cwd: ironbrewCwd, // Current Working Directory
            detached: true,
        });

        let stderrData = "";

        process.stderr.on("data", (data) => {
            const err = Buffer.from(data).toString("utf-8");
            stderrData += err;
            console.log("STDERR:", err);
        });

        process.stdout.on("data", (data) => {
            console.log("STDOUT:", Buffer.from(data).toString("utf-8"));
        });

        process.on("error", (err) => {
            console.error("Process error:", err);
            input.removeCallback();
            output.removeCallback();
            reject(err);
        });

        process.on("exit", (code) => {
            console.log("Process exited with code:", code);

            if (code !== 0) {
                input.removeCallback();
                output.removeCallback();
                return reject(new Error(stderrData || "IronBrew2 exited with error code: " + code));
            }

            if (!fs.existsSync(output.name)) {
                input.removeCallback();
                output.removeCallback();
                return reject(new Error("Output file not generated"));
            }

            let source = fs.readFileSync(output.name, "utf-8");

            if (!source || source.trim().length === 0) {
                input.removeCallback();
                output.removeCallback();
                return reject(new Error("Output file is empty"));
            }

            input.removeCallback();
            output.removeCallback();

            return resolve(source);
        });
    });
}
