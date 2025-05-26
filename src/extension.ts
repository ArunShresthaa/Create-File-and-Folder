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
      console.log("=== updateSuggestions called ===");
      console.log("inputValue:", JSON.stringify(inputValue));

      const suggestions: vscode.QuickPickItem[] = [];

      if (!inputValue.trim()) {
        console.log("Empty input - showing all folders");
        // Show all workspace folders when no input
        for (const folderPath of allFolders) {
          const relativePath = path
            .relative(workspaceRoot, folderPath)
            .replace(/\\/g, "/");
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
        console.log("Input contains path separator");
        // User is specifying a path, parse it
        const normalizedInput = inputValue.replace(/\\/g, "/");
        console.log("normalizedInput:", JSON.stringify(normalizedInput));
        const lastSlashIndex = normalizedInput.lastIndexOf("/");
        console.log("lastSlashIndex:", lastSlashIndex);
        const fileName = normalizedInput.substring(lastSlashIndex + 1);
        console.log("fileName:", JSON.stringify(fileName));

        if (fileName && fileName.trim()) {
          const isFile = hasFileExtension(fileName);
          console.log("isFile:", isFile);

          suggestions.push({
            label: `Create: ${fileName}`,
            description: isFile ? "file" : "folder",
            detail: normalizedInput,
            kind: vscode.QuickPickItemKind.Default,
          });
          console.log("Added create suggestion:", suggestions[0]);
        }
      } else {
        console.log("Simple input - no path separator");
        // Simple input - could be file or folder name
        const isFile = hasFileExtension(inputValue);
        console.log("isFile:", isFile);

        // Add option to create in current file's directory
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.uri.scheme === "file") {
          const currentFileDir = path.dirname(activeEditor.document.uri.fsPath);
          const relativePath = path
            .relative(workspaceRoot, currentFileDir)
            .replace(/\\/g, "/");
          const displayPath = relativePath || ".";

          suggestions.push({
            label: `Create: ${inputValue}`,
            description: `${isFile ? "file" : "folder"} in current directory`,
            detail:
              displayPath !== "." ? `${displayPath}/${inputValue}` : inputValue,
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
            const relativePath = path
              .relative(workspaceRoot, folderPath)
              .replace(/\\/g, "/");
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
      console.log("Final suggestions count:", suggestions.length);
      console.log("Final suggestions:", suggestions);
      quickPick.items = suggestions;

      // If there's only one suggestion and it's a "Create" option, make sure it's active
      if (
        suggestions.length === 1 &&
        suggestions[0].label.startsWith("Create:")
      ) {
        // Clear any previous selection and set the new item as active
        quickPick.selectedItems = [];
        setTimeout(() => {
          quickPick.activeItems = [suggestions[0]];
        }, 0);
      }
    } catch (error) {
      console.error("Error updating suggestions:", error);
    }
  };

  // Handle input changes
  quickPick.onDidChangeValue(async (value) => {
    currentInput = value;
    await updateSuggestions(value);
  }); // Handle selection
  quickPick.onDidAccept(async () => {
    console.log("=== onDidAccept called ===");
    const selected = quickPick.selectedItems[0];
    const activeItem = quickPick.activeItems[0];
    console.log("selected item:", selected);
    console.log("active item:", activeItem);
    console.log("currentInput:", JSON.stringify(currentInput));
    console.log("quickPick.value:", JSON.stringify(quickPick.value));

    // Use activeItem if available, otherwise fall back to selected item
    const itemToUse = activeItem || selected;

    // Check if we have a path input that should be created directly
    const hasPathInput =
      currentInput.includes("/") || currentInput.includes("\\");
    const hasCreateSuggestion =
      quickPick.items.length === 1 &&
      quickPick.items[0].label.startsWith("Create:");

    if (hasPathInput && hasCreateSuggestion) {
      console.log("Direct path creation - using the Create suggestion");
      const createItem = quickPick.items[0];
      const relativePath = createItem.detail!;
      const normalizedPath = relativePath.replace(/\\/g, "/");
      const fullPath = path.resolve(workspaceRoot, normalizedPath);
      const isFile = createItem.description!.includes("file");

      console.log("relativePath:", JSON.stringify(relativePath));
      console.log("normalizedPath:", JSON.stringify(normalizedPath));
      console.log("fullPath:", JSON.stringify(fullPath));
      console.log("isFile:", isFile);

      await createPath(fullPath, isFile);
      quickPick.hide();
      return;
    }

    if (itemToUse) {
      console.log("Has item to use:", itemToUse);
      if (
        itemToUse.description === "folder" &&
        !itemToUse.label.startsWith("Create:")
      ) {
        console.log("Selected a folder for navigation");
        // User selected a folder - update input to show the folder path
        const folderPath = itemToUse.detail === "." ? "" : itemToUse.detail;
        quickPick.value = folderPath ? folderPath + "/" : "";
        currentInput = quickPick.value;
        console.log(
          "Updated quickPick.value to:",
          JSON.stringify(quickPick.value)
        );
        await updateSuggestions(currentInput);
        return;
      } else if (itemToUse.label.startsWith("Create:")) {
        console.log("Selected create option");
        // Create new file/folder
        const relativePath = itemToUse.detail!;
        const normalizedPath = relativePath.replace(/\\/g, "/");
        const fullPath = path.resolve(workspaceRoot, normalizedPath);
        const isFile = itemToUse.description!.includes("file");

        console.log("relativePath:", JSON.stringify(relativePath));
        console.log("normalizedPath:", JSON.stringify(normalizedPath));
        console.log("fullPath:", JSON.stringify(fullPath));
        console.log("isFile:", isFile);

        await createPath(fullPath, isFile);
        quickPick.hide();
        return;
      }
    } else {
      console.log("No selected item - using currentInput");
      // No selection, use current input
      if (currentInput.trim()) {
        console.log("currentInput has content");
        const activeEditor = vscode.window.activeTextEditor;
        let targetPath = currentInput;

        // Normalize path separators
        targetPath = targetPath.replace(/\\/g, "/");
        console.log("normalized targetPath:", JSON.stringify(targetPath));

        // If no path specified and we have an active editor, use its directory
        if (
          !targetPath.includes("/") &&
          activeEditor &&
          activeEditor.document.uri.scheme === "file"
        ) {
          console.log("Adding current file directory to path");
          const currentFileDir = path.dirname(activeEditor.document.uri.fsPath);
          const relativePath = path
            .relative(workspaceRoot, currentFileDir)
            .replace(/\\/g, "/");
          targetPath =
            relativePath && relativePath !== "."
              ? `${relativePath}/${targetPath}`
              : targetPath;
          console.log(
            "final targetPath with current dir:",
            JSON.stringify(targetPath)
          );
        }

        const isFile = hasFileExtension(path.basename(targetPath));
        const fullPath = path.resolve(workspaceRoot, targetPath);
        console.log("final isFile:", isFile);
        console.log("final fullPath:", JSON.stringify(fullPath));

        await createPath(fullPath, isFile);
      } else {
        console.log("currentInput is empty");
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
    console.log("=== createPath called ===");
    console.log("fullPath:", JSON.stringify(fullPath));
    console.log("isFile:", isFile);

    // Ensure parent directory exists
    const parentDir = path.dirname(fullPath);
    console.log("parentDir:", JSON.stringify(parentDir));

    if (!fs.existsSync(parentDir)) {
      console.log("Creating parent directory");
      fs.mkdirSync(parentDir, { recursive: true });
    }

    if (isFile) {
      console.log("Creating file");
      // Create file
      if (fs.existsSync(fullPath)) {
        console.log("File already exists, asking for overwrite");
        const overwrite = await vscode.window.showWarningMessage(
          `File "${path.basename(fullPath)}" already exists. Overwrite?`,
          "Yes",
          "No"
        );
        if (overwrite !== "Yes") {
          console.log("User chose not to overwrite");
          return;
        }
      }

      fs.writeFileSync(fullPath, "");
      console.log("File written");
      const uri = vscode.Uri.file(fullPath);
      await vscode.window.showTextDocument(uri);
      console.log("File opened in editor");
      vscode.window.showInformationMessage(
        `File created: ${path.basename(fullPath)}`
      );
    } else {
      console.log("Creating folder");
      // Create folder
      if (fs.existsSync(fullPath)) {
        console.log("Folder already exists");
        vscode.window.showWarningMessage(
          `Folder "${path.basename(fullPath)}" already exists.`
        );
        return;
      }

      fs.mkdirSync(fullPath, { recursive: true });
      console.log("Folder created");

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
    console.error("Error in createPath:", error);
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
