# About

This is an Omni Automation plug-in bundle for OmniFocus that is intended to be used to assist in building other OmniFocus plug-ins with search form interfaces.

The functions in this library return a form with two fields: the first is a 'String' field for the user to input search text, and the second is a list of tasks/tags/folders/projects/anything that is narrowed down by the search terms.

The search algorithm works similarly (but not necessarily identically) to OmniFocus's built-in 'smart search' so exact search terms are not required i.e. searching for 'tp' will return the result 'Test Project'. (However, if desired, a custom function can be passed to the custom `searchForm` function to use a different method.)

_Credits:_ 

The original idea for this plug-in came from Omni's Slack community, with the first iteration of code for the form dialogue written by Sal Soghoian.

The 'fuzzy search' algorithm and code used in this plug-in was created by Forrest Smith: https://www.forrestthewoods.com/blog/reverse_engineering_sublime_texts_fuzzy_match/

> [!NOTE]  
> Please note that all scripts on my GitHub account (or shared elsewhere) are works in progress. If you encounter any issues or have any suggestions please let me know--and do please make sure you backup your database before running scripts from the internet!)

## Known issues 

Refer to ['issues'](https://github.com/ksalzke/fuzzy-search-library/issues) for known issues and planned changes/enhancements.

# Installation & Set-Up

## Installation

1. Download the [latest release](https://github.com/ksalzke/fuzzy-search-library/releases/latest).
2. Unzip the downloaded file.
3. Move the `.omnifocusjs` file to your OmniFocus plug-in library folder (or open it to install).

## Example Usage

Get the library:
```javascript
// get the library
const fuzzySearchPlugIn = PlugIn.find('com.KaitlinSalzke.fuzzySearchLib', null)
if (!fuzzySearchPlugIn) {
    const alert = new Alert(
    'Fuzzy Search Library Required',
    'For this plug-in to work correctly, the \'Fuzzy Search\' plug-in (https://github.com/ksalzke/fuzzy-search-library) is also required and needs to be added to the plug-in folder separately. Either you do not currently have this plugin installed, or it is not installed correctly.'
    )
    alert.show(null)
}
const fuzzySearchLib = fuzzySearchPlugIn.library('fuzzySearchLib')
```

Use an existing dialogue:
```javascript
// get the form to start with (after getting the library, as above)
const form = fuzzySearchLib.activeTagsFuzzySearchForm()

// add any additional forms that are desired
form.addField(new Form.Field.Checkbox('flag', 'Add flag?', false), null)

// show the form
await form.show('Tags To Add', 'OK')
```

The above generates the dialogue below: 

[INSERT VIDEO HERE]

Alternatively, a **custom** list/form can be used by calling the `searchForm` function with appropriate parameters.


Processing the results of the form:
```javascript
// get the information from the form (the value is 'menuItem')
const tag = form.values.menuItem
const flagged = form.values.flag

// perform desired actions
for (const task of selection.tasks) {
    task.addTag(tag)
    task.flagged = flagged
}
```

# Actions

This plug-in does not contain any actions.

# Functions

The following actions are contained within the `fuzzySearchLib` library:



## `getTaskPath?: (task: Task) => string`

Returns the full path of a task, from the project level. Nested action groups are also included

## `searchForm?: (allItems: any, itemTitles: string[], firstSelected: any, matchingFunction: Function | null) => FuzzySearchForm`

Returns a custom search form.
`allItems` is a list of any items.
`itemTitles` is a list of strings that represent those items.
`firstSelected` is one of the items that should be selected by default.
`matchingFunction` is a function that should be used to determine which functions match the search input. (For example, passing `projectsMatching` will use the default OmniFocus methodology and could be used on a list containing only projects.) If no function is passed, the default 'smart search' logic will be used.

## `allTasksFuzzySearchForm?: () => FuzzySearchForm`

Returns a search form which includes all tasks (including completed and dropped tasks).

## `remainingTasksFuzzySearchForm?: () => FuzzySearchForm`

Returns a search form which includes all remaining tasks.

## `activeTagsFuzzySearchForm?: () => FuzzySearchForm`

Returns a search form which includes all active tags.

## `activeFoldersFuzzySearchForm?: () => FuzzySearchForm`

Returns a search form which includes all active folders.

## `allProjectsFuzzySearchForm?: () => FuzzySearchForm`

Returns a search form which includes all projects (including completed and dropped projects).

## `remainingProjectsFuzzySearchForm?: () => FuzzySearchForm`

Returns a search form which includes all remaining projects.

## `truncateString?: (string: string, length: number) => string`

Truncates a given string to the given number of characters.