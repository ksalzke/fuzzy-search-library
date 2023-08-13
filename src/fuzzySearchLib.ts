interface FuzzySearchLibrary extends PlugIn.Library {
  searchForm?: (allItems: any, itemTitles: string[], firstSelected: any, matchingFunction: Function | null) => FuzzySearchForm
  allTasksFuzzySearchForm?: () => FuzzySearchForm
  remainingTasksFuzzySearchForm?: () => FuzzySearchForm
}

interface FuzzySearchForm extends Form {
  values: {
    textInput?: string
    menuItem?: any
  }
}

(() => {
  const lib: FuzzySearchLibrary = new PlugIn.Library(new Version('1.0'))

  lib.searchForm = (allItems, itemTitles, firstSelected, matchingFunction) => {
    const form: FuzzySearchForm = new Form()

    // search box
    form.addField(new Form.Field.String('textInput', 'Search', null, null), null)

    // result box
    const searchResults = allItems // list of tasks
    const searchResultTitles = itemTitles // list of task names
    const searchResultIndexes = allItems.map((_, index: number) => index) // list of task indexes
    const firstSelectedIndex = (searchResults.indexOf(firstSelected) === -1) ? null : searchResults.indexOf(firstSelected)
    const popupMenu = new Form.Field.Option('menuItem', 'Results', searchResults, searchResultTitles, firstSelected, null)
    popupMenu.allowsNull = true
    popupMenu.nullOptionTitle = 'No Results'
    form.addField(popupMenu, null)

    let currentValue = ''

    // validation
    form.validate = (formObject: FuzzySearchForm) => {
      const textValue = formObject.values.textInput || ''
      if (textValue !== currentValue) {
        currentValue = textValue
        // remove popup menu
        if (form.fields.some(field => field.key === 'menuItem')) {
          form.removeField(form.fields.find(field => field.key === 'menuItem'))
        }
      }

      if (!form.fields.some(field => field.key === 'menuItem')) {
        // search using provided string
        const searchResults = (matchingFunction === null) ? allItems.filter((_, index: number) => itemTitles[index].toLowerCase().includes(textValue.toLowerCase())) : (textValue !== '') ? matchingFunction(textValue) : allItems
        const resultIndexes = []
        const resultTitles = searchResults.map((item, index) => {
          resultIndexes.push(index)
          return itemTitles[allItems.indexOf(item)]
        })
        // add new popup menu
        const popupMenu = new Form.Field.Option('menuItem', 'Results', searchResults, resultTitles, searchResults[0], null)
        form.addField(popupMenu, 1)
        return false
      }
      else {
        const menuValue = formObject.values.menuItem
        if (menuValue === undefined || String(menuValue) === 'null') { return false }
        return true
      }
    }

    return form
  }

  lib.allTasksFuzzySearchForm = () => {
    return lib.searchForm(flattenedTasks, flattenedTasks.map(t => t.name.slice(0, 80)), null, null)
  }

  lib.remainingTasksFuzzySearchForm = () => {
    const remaining = flattenedTasks.filter(task => ![Task.Status.Completed, Task.Status.Dropped].includes(task.taskStatus))
    return lib.searchForm(remaining, remaining.map(t => t.name), null, null)
  }



  return lib
})()
