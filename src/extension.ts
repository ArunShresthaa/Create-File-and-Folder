import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "quickFileFolder.create",
    async () => {
      try {
        await createFileOrFolder();
      } catch (error) {
        vscode.window.showErrorMessage(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }
  );

  context.subscriptions.push(disposable);
}

async function createFileOrFolder() {
  if (
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length === 0
  ) {
    vscode.window.showErrorMessage("No workspace folder open");
    return;
  }

  const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;

  // Get all folders in workspace
  const allFolders = await getAllFoldersInWorkspace(workspaceRoot);

  // Create QuickPick for path input with suggestions
  const quickPick = vscode.window.createQuickPick();
  quickPick.placeholder =
    "Enter filename (with extension) or foldername, or select a folder first";
  quickPick.value = "";
  quickPick.items = [];
  quickPick.canSelectMany = false;

  let currentInput = quickPick.value;
  let selectedFolderPath = "";

  // Function to update suggestions based on input
  const updateSuggestions = async (inputValue: string) => {
    try {
      const suggestions: vscode.QuickPickItem[] = [];

      if (!inputValue.trim()) {
        // Show all workspace folders when no input
        for (const folderPath of allFolders) {
          const relativePath = path.relative(workspaceRoot, folderPath);
          const displayPath = relativePath || ".";
          suggestions.push({
            label: path.basename(folderPath),
            description: "folder",
            detail: displayPath,
            kind: vscode.QuickPickItemKind.Default,
          });
        }
        quickPick.items = suggestions;
        return;
      }

      // Check if input contains path separator
      if (inputValue.includes("/") || inputValue.includes("\\")) {
        // User is specifying a path, parse it
        const normalizedInput = inputValue.replace(/\\/g, "/");
        const pathParts = normalizedInput.split("/");
        const fileName = pathParts[pathParts.length - 1];
        const folderPath = pathParts.slice(0, -1).join("/");

        if (fileName.trim()) {
          const isFile = hasFileExtension(fileName);
          const fullPath = path.join(workspaceRoot, normalizedInput);

          suggestions.push({
            label: `Create: ${fileName}`,
            description: isFile ? "file" : "folder",
            detail: normalizedInput,
            kind: vscode.QuickPickItemKind.Default,
          });
        }
      } else {
        // Simple input - could be file or folder name
        const isFile = hasFileExtension(inputValue);

        // Add option to create in current file's directory
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.uri.scheme === "file") {
          const currentFileDir = path.dirname(activeEditor.document.uri.fsPath);
          const relativePath = path.relative(workspaceRoot, currentFileDir);
          const displayPath = relativePath || ".";

          suggestions.push({
            label: `Create: ${inputValue}`,
            description: `${isFile ? "file" : "folder"} in current directory`,
            detail: displayPath ? `${displayPath}/${inputValue}` : inputValue,
            kind: vscode.QuickPickItemKind.Default,
          });
        }

        // Add option to create in workspace root
        suggestions.push({
          label: `Create: ${inputValue}`,
          description: `${isFile ? "file" : "folder"} in workspace root`,
          detail: inputValue,
          kind: vscode.QuickPickItemKind.Default,
        });

        // Filter and show matching folders
        const matchingFolders = allFolders.filter((folderPath) => {
          const folderName = path.basename(folderPath);
          return folderName.toLowerCase().includes(inputValue.toLowerCase());
        });

        if (matchingFolders.length > 0) {
          suggestions.push({
            label: "─────────────────",
            description: "Select folder first",
            detail: "",
            kind: vscode.QuickPickItemKind.Separator,
          });

          for (const folderPath of matchingFolders.slice(0, 10)) {
            // Limit to 10 results
            const relativePath = path.relative(workspaceRoot, folderPath);
            const displayPath = relativePath || ".";
            suggestions.push({
              label: path.basename(folderPath),
              description: "folder",
              detail: displayPath,
              kind: vscode.QuickPickItemKind.Default,
            });
          }
        }
      }

      quickPick.items = suggestions;
    } catch (error) {
      console.error("Error updating suggestions:", error);
    }
  };

  // Handle input changes
  quickPick.onDidChangeValue(async (value) => {
    currentInput = value;
    await updateSuggestions(value);
  });

  // Handle selection
  quickPick.onDidAccept(async () => {
    const selected = quickPick.selectedItems[0];

    if (selected) {
      if (
        selected.description === "folder" &&
        !selected.label.startsWith("Create:")
      ) {
        // User selected a folder - update input to show the folder path
        quickPick.value = selected.detail + "/";
        currentInput = quickPick.value;
        await updateSuggestions(currentInput);
        return;
      } else if (selected.label.startsWith("Create:")) {
        // Create new file/folder
        const relativePath = selected.detail!;
        const fullPath = path.join(workspaceRoot, relativePath);
        const isFile = selected.description!.includes("file");

        await createPath(fullPath, isFile);
        quickPick.hide();
        return;
      }
    } else {
      // No selection, use current input
      if (currentInput.trim()) {
        const activeEditor = vscode.window.activeTextEditor;
        let targetPath = currentInput;

        // If no path specified and we have an active editor, use its directory
        if (
          !currentInput.includes("/") &&
          !currentInput.includes("\\") &&
          activeEditor &&
          activeEditor.document.uri.scheme === "file"
        ) {
          const currentFileDir = path.dirname(activeEditor.document.uri.fsPath);
          const relativePath = path.relative(workspaceRoot, currentFileDir);
          targetPath = relativePath
            ? `${relativePath}/${currentInput}`
            : currentInput;
        }

        const isFile = hasFileExtension(currentInput);
        const fullPath = path.join(workspaceRoot, targetPath);
        await createPath(fullPath, isFile);
      }
      quickPick.hide();
    }
  });

  // Initialize suggestions
  await updateSuggestions(currentInput);

  quickPick.show();
}

function hasFileExtension(filePath: string): boolean {
  const baseName = path.basename(filePath);
  const lastDotIndex = baseName.lastIndexOf(".");

  // Check if there's a dot and it's not at the beginning (hidden files) or end
  return lastDotIndex > 0 && lastDotIndex < baseName.length - 1;
}

async function createPath(fullPath: string, isFile: boolean) {
  try {
    // Ensure parent directory exists
    const parentDir = path.dirname(fullPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    if (isFile) {
      // Create file
      if (fs.existsSync(fullPath)) {
        const overwrite = await vscode.window.showWarningMessage(
          `File "${path.basename(fullPath)}" already exists. Overwrite?`,
          "Yes",
          "No"
        );
        if (overwrite !== "Yes") {
          return;
        }
      }

      fs.writeFileSync(fullPath, "");
      const uri = vscode.Uri.file(fullPath);
      await vscode.window.showTextDocument(uri);
      vscode.window.showInformationMessage(
        `File created: ${path.basename(fullPath)}`
      );
    } else {
      // Create folder
      if (fs.existsSync(fullPath)) {
        vscode.window.showWarningMessage(
          `Folder "${path.basename(fullPath)}" already exists.`
        );
        return;
      }

      fs.mkdirSync(fullPath, { recursive: true });

      // Open the folder in the explorer
      await vscode.commands.executeCommand(
        "revealInExplorer",
        vscode.Uri.file(fullPath)
      );
      vscode.window.showInformationMessage(
        `Folder created: ${path.basename(fullPath)}`
      );
    }
  } catch (error) {
    throw new Error(
      `Failed to create ${isFile ? "file" : "folder"}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function getAllFoldersInWorkspace(
  workspaceRoot: string
): Promise<string[]> {
  const folders: string[] = [];

  async function scanDirectory(dirPath: string) {
    try {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const item of items) {
        if (
          item.isDirectory() &&
          !item.name.startsWith(".") &&
          item.name !== "node_modules"
        ) {
          const fullPath = path.join(dirPath, item.name);
          folders.push(fullPath);

          // Recursively scan subdirectories (limit depth to prevent performance issues)
          const depth =
            fullPath.split(path.sep).length -
            workspaceRoot.split(path.sep).length;
          if (depth < 10) {
            // Limit to 10 levels deep
            await scanDirectory(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
      console.error(`Cannot read directory ${dirPath}:`, error);
    }
  }

  folders.push(workspaceRoot); // Include workspace root
  await scanDirectory(workspaceRoot);

  return folders.sort();
}

export function deactivate() {}
