interface FuzzySearchLibrary extends PlugIn.Library {
  getTaskPath?: (task: Task) => string
  getTaskPathWithFolders?: (task: Task) => string
  searchForm?: (allItems: any, itemTitles: string[], firstSelected: any, matchingFunction: Function | null) => FuzzySearchForm
  allTasksFuzzySearchForm?: () => FuzzySearchForm
  remainingTasksFuzzySearchForm?: () => FuzzySearchForm
  activeTagsFuzzySearchForm?: () => FuzzySearchForm
  activeFoldersFuzzySearchForm?: () => FuzzySearchForm
  allProjectsFuzzySearchForm?: () => FuzzySearchForm
  remainingProjectsFuzzySearchForm?: () => FuzzySearchForm
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
      else return `${getPath(task.parent)} > ${task.name}`
    }
    return getPath(task)
  }

  lib.getTaskPathWithFolders = (task: Task) => {

    const getFolderPath = (task: Task) => {
      const folders = [...flattenedFolders].filter(folder => [...folder.flattenedProjects].includes(task.containingProject))
      const folderNames = [...folders].map(folder => folder.name)
      return folderNames.join(' > ')
    }

    const getPath = (task: Task) => {
      if (task.inInbox) return task.name // task in inbox
      if (!task.parent) return `${getFolderPath(task)} > ${task.name}` // is a project
      if (task.containingProject && task.parent === task.containingProject.task) {
        // task is at root of project
        return `${getFolderPath(task)} > ${task.containingProject.name} > ${task.name}`
      }
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

    const options = allItems.map((item: any, index: number) => {
      return {
        item: item,
        title: itemTitles[index]
      }
    })



    // default matching function (if none provided)
    const defaultMatcher = (textValue: string) => {

      // fuzzy match from Forrest Smith: https://www.forrestthewoods.com/blog/reverse_engineering_sublime_texts_fuzzy_match/
      //
      // VERSION
      //   0.1.0  (2016-03-28)  Initial release
      //
      // AUTHOR
      //   Forrest Smith
      //
      // CONTRIBUTORS
      //   J�rgen Tjern� - async helper
      //   Anurag Awasthi - updated to 0.2.0

      const SEQUENTIAL_BONUS = 15; // bonus for adjacent matches
      const SEPARATOR_BONUS = 30; // bonus if match occurs after a separator
      const CAMEL_BONUS = 30; // bonus if match is uppercase and prev is lower
      const FIRST_LETTER_BONUS = 15; // bonus if the first letter is matched

      const LEADING_LETTER_PENALTY = -5; // penalty applied for every letter in str before the first match
      const MAX_LEADING_LETTER_PENALTY = -15; // maximum penalty for leading letters
      const UNMATCHED_LETTER_PENALTY = -1;
      function fuzzyMatch(pattern, str) {
        const recursionCount = 0;
        const recursionLimit = 10;
        const matches = [];
        const maxMatches = 256;

        return fuzzyMatchRecursive(
          pattern,
          str,
          0 /* patternCurIndex */,
          0 /* strCurrIndex */,
          null /* srcMatces */,
          matches,
          maxMatches,
          0 /* nextMatch */,
          recursionCount,
          recursionLimit
        );
      }

      function fuzzyMatchRecursive(
        pattern,
        str,
        patternCurIndex,
        strCurrIndex,
        srcMatces,
        matches,
        maxMatches,
        nextMatch,
        recursionCount,
        recursionLimit
      ) {
        let outScore = 0;

        // Return if recursion limit is reached.
        if (++recursionCount >= recursionLimit) {
          return [false, outScore];
        }

        // Return if we reached ends of strings.
        if (patternCurIndex === pattern.length || strCurrIndex === str.length) {
          return [false, outScore];
        }

        // Recursion params
        let recursiveMatch = false;
        let bestRecursiveMatches = [];
        let bestRecursiveScore = 0;

        // Loop through pattern and str looking for a match.
        let firstMatch = true;
        while (patternCurIndex < pattern.length && strCurrIndex < str.length) {
          // Match found.
          if (
            pattern[patternCurIndex].toLowerCase() === str[strCurrIndex].toLowerCase()
          ) {
            if (nextMatch >= maxMatches) {
              return [false, outScore];
            }

            if (firstMatch && srcMatces) {
              matches = [...srcMatces];
              firstMatch = false;
            }

            const recursiveMatches = [];
            const [matched, recursiveScore] = fuzzyMatchRecursive(
              pattern,
              str,
              patternCurIndex,
              strCurrIndex + 1,
              matches,
              recursiveMatches,
              maxMatches,
              nextMatch,
              recursionCount,
              recursionLimit
            );

            if (matched) {
              // Pick best recursive score.
              if (!recursiveMatch || recursiveScore > bestRecursiveScore) {
                bestRecursiveMatches = [...recursiveMatches];
                bestRecursiveScore = recursiveScore;
              }
              recursiveMatch = true;
            }

            matches[nextMatch++] = strCurrIndex;
            ++patternCurIndex;
          }
          ++strCurrIndex;
        }

        const matched = patternCurIndex === pattern.length;

        if (matched) {
          outScore = 100;

          // Apply leading letter penalty
          let penalty = LEADING_LETTER_PENALTY * matches[0];
          penalty =
            penalty < MAX_LEADING_LETTER_PENALTY
              ? MAX_LEADING_LETTER_PENALTY
              : penalty;
          outScore += penalty;

          //Apply unmatched penalty
          const unmatched = str.length - nextMatch;
          outScore += UNMATCHED_LETTER_PENALTY * unmatched;

          // Apply ordering bonuses
          for (let i = 0; i < nextMatch; i++) {
            const currIdx = matches[i];

            if (i > 0) {
              const prevIdx = matches[i - 1];
              if (currIdx == prevIdx + 1) {
                outScore += SEQUENTIAL_BONUS;
              }
            }

            // Check for bonuses based on neighbor character value.
            if (currIdx > 0) {
              // Camel case
              const neighbor = str[currIdx - 1];
              const curr = str[currIdx];
              if (
                neighbor !== neighbor.toUpperCase() &&
                curr !== curr.toLowerCase()
              ) {
                outScore += CAMEL_BONUS;
              }
              const isNeighbourSeparator = neighbor == "_" || neighbor == " ";
              if (isNeighbourSeparator) {
                outScore += SEPARATOR_BONUS;
              }
            } else {
              // First letter
              outScore += FIRST_LETTER_BONUS;
            }
          }

          // Return best result
          if (recursiveMatch && (!matched || bestRecursiveScore > outScore)) {
            // Recursive score is better than "this"
            matches = [...bestRecursiveMatches];
            outScore = bestRecursiveScore;
            return [true, outScore];
          } else if (matched) {
            // "this" score is better than recursive
            return [true, outScore];
          } else {
            return [false, outScore];
          }
        }
        return [false, outScore];
      }

      const matchedItems = options.filter((item: any) => fuzzyMatch(textValue, item.title)[0] === true)
      const sortedMatched = matchedItems.sort((a: any, b: any) => {
        const aScore = fuzzyMatch(textValue, a.title)[1]
        const bScore = fuzzyMatch(textValue, b.title)[1]
        return bScore - aScore
      }).map(item => item.item)

      return sortedMatched
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
          return itemTitles[allItems.indexOf(item)]
        })
        // add new popup menu
        const popupMenu = new Form.Field.Option('menuItem', 'Results', searchResults, resultTitles.map(title => lib.truncateString(title, 150)), searchResults[0], null)
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

  lib.activeFoldersFuzzySearchForm = () => {
    const activeFolders = flattenedFolders.filter(folder => folder.status === Folder.Status.Active)
    return lib.searchForm(activeFolders, activeFolders.map(f => f.name), null, null)
  }

  lib.allProjectsFuzzySearchForm = () => {
    return lib.searchForm(flattenedProjects, flattenedProjects.map(t => lib.getTaskPath(t)), null, null)
  }

  lib.remainingProjectsFuzzySearchForm = () => {
    const remaining = flattenedProjects.filter(project => ![Task.Status.Completed, Task.Status.Dropped].includes(project.taskStatus))
    return lib.searchForm(remaining, remaining.map(t => lib.getTaskPath(t)), null, null)
  }

  return lib
})()
