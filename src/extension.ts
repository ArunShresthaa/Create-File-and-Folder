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
  // Get the current file's directory as default
  const activeEditor = vscode.window.activeTextEditor;
  let defaultPath = "";

  if (activeEditor && activeEditor.document.uri.scheme === "file") {
    defaultPath = path.dirname(activeEditor.document.uri.fsPath);
  } else if (
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
  ) {
    defaultPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
  }

  // Create QuickPick for path input with suggestions
  const quickPick = vscode.window.createQuickPick();
  quickPick.placeholder =
    "Enter file/folder path (ends with extension = file, otherwise = folder)";
  quickPick.value = defaultPath ? defaultPath + path.sep : "";
  quickPick.items = [];
  quickPick.canSelectMany = false;

  let currentInput = quickPick.value;

  // Function to update suggestions based on input
  const updateSuggestions = async (inputValue: string) => {
    try {
      const suggestions: vscode.QuickPickItem[] = [];

      if (!inputValue.trim()) {
        quickPick.items = suggestions;
        return;
      }

      // Parse the input to get directory and partial name
      let dirPath = "";
      let partialName = "";

      if (inputValue.includes(path.sep)) {
        const lastSeparatorIndex = inputValue.lastIndexOf(path.sep);
        dirPath = inputValue.substring(0, lastSeparatorIndex);
        partialName = inputValue.substring(lastSeparatorIndex + 1);
      } else {
        dirPath = ".";
        partialName = inputValue;
      }

      // Make sure directory path is absolute
      if (!path.isAbsolute(dirPath)) {
        if (
          vscode.workspace.workspaceFolders &&
          vscode.workspace.workspaceFolders.length > 0
        ) {
          dirPath = path.resolve(
            vscode.workspace.workspaceFolders[0].uri.fsPath,
            dirPath
          );
        } else {
          dirPath = path.resolve(dirPath);
        }
      }

      // Check if directory exists
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        const items = fs.readdirSync(dirPath);

        // Filter items based on partial name
        const filteredItems = items.filter(
          (item) =>
            partialName === "" ||
            item.toLowerCase().startsWith(partialName.toLowerCase())
        );

        // Add existing files and folders as suggestions
        for (const item of filteredItems) {
          const itemPath = path.join(dirPath, item);
          const stat = fs.statSync(itemPath);
          const isDirectory = stat.isDirectory();

          suggestions.push({
            label: item,
            description: isDirectory ? "folder" : "file",
            detail: itemPath,
            kind: isDirectory
              ? vscode.QuickPickItemKind.Default
              : vscode.QuickPickItemKind.Default,
          });
        }

        // Add parent directory navigation if not at root
        if (dirPath !== path.dirname(dirPath)) {
          suggestions.unshift({
            label: "..",
            description: "parent directory",
            detail: path.dirname(dirPath),
            kind: vscode.QuickPickItemKind.Separator,
          });
        }
      }

      // Add current input as create option if it doesn't exist
      const fullPath = path.isAbsolute(inputValue)
        ? inputValue
        : path.resolve(dirPath, inputValue);
      if (!fs.existsSync(fullPath) && inputValue.trim() !== "") {
        const isFile = hasFileExtension(inputValue);
        suggestions.unshift({
          label: `Create: ${path.basename(inputValue)}`,
          description: isFile ? "new file" : "new folder",
          detail: fullPath,
          kind: vscode.QuickPickItemKind.Default,
        });
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
      if (selected.label === "..") {
        // Navigate to parent directory
        quickPick.value = selected.detail + path.sep;
        currentInput = quickPick.value;
        await updateSuggestions(currentInput);
        return;
      } else if (selected.label.startsWith("Create: ")) {
        // Create new file/folder
        await createPath(selected.detail!, selected.description === "new file");
        quickPick.hide();
        return;
      } else if (selected.description === "folder") {
        // Navigate into folder
        quickPick.value = selected.detail + path.sep;
        currentInput = quickPick.value;
        await updateSuggestions(currentInput);
        return;
      } else {
        // Selected existing file - open it
        const uri = vscode.Uri.file(selected.detail!);
        await vscode.window.showTextDocument(uri);
        quickPick.hide();
        return;
      }
    } else {
      // No selection, use current input
      if (currentInput.trim()) {
        const isFile = hasFileExtension(currentInput);
        const fullPath = path.isAbsolute(currentInput)
          ? currentInput
          : path.resolve(defaultPath || ".", currentInput);
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

export function deactivate() {}
