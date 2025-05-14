import path from 'path';
import { safeReadFile } from '../core/core';



export async function getPackageDependencies(projectPath: string): Promise<string[]> {
  try {
    const content = await safeReadFile(path.join(projectPath, 'package.json'));
    const pkg = JSON.parse(content);
    return Object.keys(pkg.dependencies || {});
  } catch {
    return [];
  }
}