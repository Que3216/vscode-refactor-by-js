import { existsSync } from "fs";
import { dirname, join, relative } from "path";

export function findPathToPackageRoot(filePath: string) {
    const packagePath = findPackageJsonPathForFile(filePath);
    if (packagePath === undefined) {
        return "";
    }
    const pathToPackagesDirectory = dirname(relative(filePath, join(dirname(packagePath), "src")));
    return pathToPackagesDirectory;
}

function findPackageJsonPathForFile(filePath: string): string | undefined {
    let directory = dirname(filePath);
    let previousDirectory = null;
    while (directory !== previousDirectory) {
        previousDirectory = directory;
        const packageJsonPath = join(directory, "package.json");
        if (existsSync(packageJsonPath)) {
            if (previousDirectory.endsWith("/packages")) {
                // We've gone too far
                return undefined;
            }
            return packageJsonPath;
        }
        directory = dirname(directory);
    }
    return undefined;
}