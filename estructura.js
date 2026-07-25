import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const skip = ["node_modules", "vscode", ".git"]
/**
 * Recursively retrieves all file paths within a directory and its subdirectories.
 * @param {string} dir The directory path to start the search from.
 * @yields {string} The full path of each file found.
 */
export async function* getFilesRecursively(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* getFilesRecursively(res);
    } else {
      yield res;
    }
  }
}

// Example Usage:
(async () => {
  const startDir = './'; // Or use '.' for current directory
  for await (const file of getFilesRecursively(startDir)) {
    if (file.includes(skip[0])) continue;
    if (file.includes(skip[1])) continue;
    if (file.includes(skip[2])) continue;
    //console.log(file); // This is the full path
    console.log(file.replace("C:\\pesca-comunidad", "")); // This is the full path
  }
})();