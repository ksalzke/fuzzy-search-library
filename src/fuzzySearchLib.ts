interface FuzzySearchLibrary extends PlugIn.Library {
  getTaskPath?: (task: Task) => string
  searchForm?: (allItems: any, itemTitles: string[], firstSelected: any, matchingFunction: Function | null) => FuzzySearchForm
  allTasksFuzzySearchForm?: () => FuzzySearchForm
  remainingTasksFuzzySearchForm?: () => FuzzySearchForm
  activeTagsFuzzySearchForm?: () => FuzzySearchForm
  truncateString?: (string: string, length: number) => string
}

interface FuzzySearchForm extends Form {
  values: {
    textInput?: string
    menuItem?: any
  }
}

(() => {
  const lib: FuzzySearchLibrary = new PlugIn.Library(new Version('1.0'))

  lib.getTaskPath = (task: Task) => {
    const getPath = (task) => {
      if (!task.parent) return task.name // project in inbox, first level
      if (task.containingProject && task.parent === task.containingProject.task) return `${task.containingProject.name} > ${task.name}`
      else if (task.containingProject && task.parent === task.containingProject.task) return task.name
      else return `${getPath(task.parent)} > ${task.name}`
    }
    return getPath(task)
  }

  lib.truncateString = (str: string, length: number) => {
    if (str.length <= length) return str
    return str.slice(0, length) + '...'
  }

  lib.searchForm = (allItems, itemTitles, firstSelected, matchingFunction) => {
    const form: FuzzySearchForm = new Form()

    // default matching function (if none provided)
    const defaultMatcher = (textValue: string) => {
      return allItems.filter((_, index: number) => itemTitles[index].toLowerCase().includes(textValue.toLowerCase()))
    }

    // search box
    form.addField(new Form.Field.String('textInput', 'Search', null, null), null)

    // result box
    const searchResults = allItems // list of tasks
    const searchResultTitles = itemTitles // list of task names
    const popupMenu = new Form.Field.Option('menuItem', 'Results', searchResults, searchResultTitles.map(title => lib.truncateString(title, 150)), firstSelected, null)
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
        const searchResults = (matchingFunction === null) ? defaultMatcher(textValue) : (textValue !== '') ? matchingFunction(textValue) : allItems
        const resultIndexes = []
        const resultTitles = searchResults.map((item, index) => {
          resultIndexes.push(index)
          return itemTitles[allItems.indexOf(item)]
        })
        // add new popup menu
        const popupMenu = new Form.Field.Option('menuItem', 'Results', searchResults, resultTitles.map(title => lib.truncateString(title, 70)), searchResults[0], null)
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
    return lib.searchForm(flattenedTasks, flattenedTasks.map(t => lib.getTaskPath(t)), null, null)
  }

  lib.remainingTasksFuzzySearchForm = () => {
    const remaining = flattenedTasks.filter(task => ![Task.Status.Completed, Task.Status.Dropped].includes(task.taskStatus))
    return lib.searchForm(remaining, remaining.map(t => lib.getTaskPath(t)), null, null)
  }

  lib.activeTagsFuzzySearchForm = () => {
    const activeTags = flattenedTags.filter(tag => tag.active)
    return lib.searchForm(activeTags, activeTags.map(t => t.name), null, null)
  }



  return lib
})()
