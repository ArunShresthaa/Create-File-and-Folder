# Quick File & Folder Creator

[![Version](https://img.shields.io/visual-studio-marketplace/v/ArunShresthaa.quick-file-folder-creator)](https://marketplace.visualstudio.com/items?itemName=ArunShresthaa.quick-file-folder-creator)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/ArunShresthaa.quick-file-folder-creator)](https://marketplace.visualstudio.com/items?itemName=ArunShresthaa.quick-file-folder-creator)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/ArunShresthaa.quick-file-folder-creator)](https://marketplace.visualstudio.com/items?itemName=ArunShresthaa.quick-file-folder-creator&ssr=false#review-details)

A powerful VS Code extension for quickly creating files and folders with intelligent path suggestions. Stop navigating through the file explorer - create files and folders anywhere in your workspace with just a few keystrokes!

![Demo](https://raw.githubusercontent.com/ArunShresthaa/Create-File-and-Folder/main/images/demo.gif)

## Features

- **Smart Path Completion**: Type "/" to navigate through folders with intellisense-like suggestions
- **Quick Creation**: Instantly create files and folders from a simple command palette interface
- **Context-Aware**: Creates files in the current directory by default when appropriate
- **Path Navigation**: Easily drill down through your folder structure
- **File Extension Detection**: Automatically determines if you're creating a file or folder based on input
- **Workspace Integration**: Creates files and folders anywhere in your workspace
- **Nested Creation**: Automatically creates parent directories if they don't exist
- **Path Suggestions**: Shows a list of existing directories to choose from
- **Current Directory Support**: Creates files in the directory of the currently active file with a simple option
- **Path Normalization**: Works with both forward slashes (/) and backslashes (\\)

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Quick File & Folder Creator"
4. Click Install

## Usage

1. Press `Ctrl+Shift+N` (or `Cmd+Shift+N` on Mac) to activate the Quick Create File/Folder command
2. Start typing:
   - Just a name: Creates in the workspace root or current directory
   - Path/name: Creates in the specified path (parent directories created automatically)
   - Select from suggested folders to navigate there first

### Creating Files

- Type a name with an extension (e.g., `app.js`, `styles.css`) to create a file
- If created, the file will automatically open in the editor

### Creating Folders

- Type a name without an extension (e.g., `components`, `utils`) to create a folder
- The folder will be revealed in the Explorer after creation

### Navigating Paths

- Type a partial path like `src/components/` and see suggestions
- Select a folder from suggestions to navigate to it
- Keep building your path with further typing

### Creating Nested Structures

- Type something like `components/ui/Button.js` to create both directories and the file
- All necessary parent directories will be created automatically

## Keyboard Shortcuts

- `Ctrl+Shift+N` (Windows/Linux)
- `Cmd+Shift+N` (macOS)

To customize the keyboard shortcut:

1. Open the Keyboard Shortcuts editor (`Ctrl+K` then `Ctrl+S`)
2. Search for "Quick Create File/Folder"
3. Click the pencil icon and define your preferred shortcut

## Extension Settings

This extension has no settings that require configuration.

## Known Issues

- When creating files with the same name in different directories in quick succession, the wrong file might open
- Deep folder traversal may experience slight performance delays

## Release Notes

### 1.0.0

- Initial release with core file and folder creation functionality
- Path suggestions and intelligent path navigation
- Support for creating nested directories automatically

## Contributing

Contributions are welcome! Feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request

## License

This extension is licensed under the [MIT License](https://github.com/ArunShresthaa/Create-File-and-Folder/blob/main/LICENSE).

## Support

If you find this extension useful, consider:

- [Rating it on the VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ArunShresthaa.quick-file-folder-creator&ssr=false#review-details)
- [Starring the GitHub repository](https://github.com/ArunShresthaa/Create-File-and-Folder)
- [Reporting issues or suggesting features](https://github.com/ArunShresthaa/Create-File-and-Folder/issues)

---

**Enjoy!**
