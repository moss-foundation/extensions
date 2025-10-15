TODO: Clarify the schema of Sapic.json
TODO: Clarify the extension id format

# How to develop and publish an extension
## 1. Create an extension repo with the following structure
/Sapic.json

/themes (if you have this contribution)

/languages (if you have this contribution)

... (other contribution points listed in the Sapic.json)

The extension repo can be developed independently of the extension registry,
The registry always points to the latest accepted commit for a particular extension.
If you want to publish a new extension or a new version of an existing extension, create a fork of this repo and
do the following:

## 2(a). Publish a new extension

i. In you fork, run `git submodule add <link-to-your-repo> extensions/<your-extension-id>`

For example: `git submodule add https://github.com/foo/bar extensions/foo-bar`

ii. Stage all changes by `git add .`

iii. Commit and push the changes to your fork

iv. Make a Pull Request to the main branch of this repo

v. A maintainer will review your PR, and, if accepted, this extension will be packaged and published to the remote
extension registry, ready to be discovered by other users of the app.

## 2(b). Publish a new version of an extension

Note: We will keep a record of every approved version of each extension, allowing the user to decide when to update
Thus, publishing a new version of an extension will not delete the old versions: they will still be discoverable.

i. Run `git submodule update --remote extensions/<your-extension-id>`

ii. Stage all changes by `git add .`

iii. Commit and push the changes to your fork

iv. Make a Pull Request to the main branch of this repo

v. A maintainer will review your PR, and, if accepted, the new version will be packaged and published to the remote 
extension registry, ready to be discovered by other users of the app.


