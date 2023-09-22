var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
(function () {
    var lib = new PlugIn.Library(new Version('1.0'));
    lib.getTaskPath = function (task) {
        var getPath = function (task) {
            if (!task.parent)
                return task.name; // project in inbox, first level
            if (task.containingProject && task.parent === task.containingProject.task)
                return task.containingProject.name + " > " + task.name;
            else if (task.containingProject && task.parent === task.containingProject.task)
                return task.name;
            else
                return getPath(task.parent) + " > " + task.name;
        };
        return getPath(task);
    };
    lib.truncateString = function (str, length) {
        if (str.length <= length)
            return str;
        return str.slice(0, length) + '...';
    };
    lib.searchForm = function (allItems, itemTitles, firstSelected, matchingFunction) {
        var form = new Form();
        var options = allItems.map(function (item, index) {
            return {
                item: item,
                title: itemTitles[index]
            };
        });
        // default matching function (if none provided)
        var defaultMatcher = function (textValue) {
            // fuzzy match from Forrest Smith: https://pkg.go.dev/github.com/deanishe/awgo/fuzzy#pkg-overview
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
            var SEQUENTIAL_BONUS = 15; // bonus for adjacent matches
            var SEPARATOR_BONUS = 30; // bonus if match occurs after a separator
            var CAMEL_BONUS = 30; // bonus if match is uppercase and prev is lower
            var FIRST_LETTER_BONUS = 15; // bonus if the first letter is matched
            var LEADING_LETTER_PENALTY = -5; // penalty applied for every letter in str before the first match
            var MAX_LEADING_LETTER_PENALTY = -15; // maximum penalty for leading letters
            var UNMATCHED_LETTER_PENALTY = -1;
            function fuzzyMatch(pattern, str) {
                var recursionCount = 0;
                var recursionLimit = 10;
                var matches = [];
                var maxMatches = 256;
                return fuzzyMatchRecursive(pattern, str, 0 /* patternCurIndex */, 0 /* strCurrIndex */, null /* srcMatces */, matches, maxMatches, 0 /* nextMatch */, recursionCount, recursionLimit);
            }
            function fuzzyMatchRecursive(pattern, str, patternCurIndex, strCurrIndex, srcMatces, matches, maxMatches, nextMatch, recursionCount, recursionLimit) {
                var outScore = 0;
                // Return if recursion limit is reached.
                if (++recursionCount >= recursionLimit) {
                    return [false, outScore];
                }
                // Return if we reached ends of strings.
                if (patternCurIndex === pattern.length || strCurrIndex === str.length) {
                    return [false, outScore];
                }
                // Recursion params
                var recursiveMatch = false;
                var bestRecursiveMatches = [];
                var bestRecursiveScore = 0;
                // Loop through pattern and str looking for a match.
                var firstMatch = true;
                while (patternCurIndex < pattern.length && strCurrIndex < str.length) {
                    // Match found.
                    if (pattern[patternCurIndex].toLowerCase() === str[strCurrIndex].toLowerCase()) {
                        if (nextMatch >= maxMatches) {
                            return [false, outScore];
                        }
                        if (firstMatch && srcMatces) {
                            matches = __spreadArray([], srcMatces, true);
                            firstMatch = false;
                        }
                        var recursiveMatches = [];
                        var _a = fuzzyMatchRecursive(pattern, str, patternCurIndex, strCurrIndex + 1, matches, recursiveMatches, maxMatches, nextMatch, recursionCount, recursionLimit), matched_1 = _a[0], recursiveScore = _a[1];
                        if (matched_1) {
                            // Pick best recursive score.
                            if (!recursiveMatch || recursiveScore > bestRecursiveScore) {
                                bestRecursiveMatches = __spreadArray([], recursiveMatches, true);
                                bestRecursiveScore = recursiveScore;
                            }
                            recursiveMatch = true;
                        }
                        matches[nextMatch++] = strCurrIndex;
                        ++patternCurIndex;
                    }
                    ++strCurrIndex;
                }
                var matched = patternCurIndex === pattern.length;
                if (matched) {
                    outScore = 100;
                    // Apply leading letter penalty
                    var penalty = LEADING_LETTER_PENALTY * matches[0];
                    penalty =
                        penalty < MAX_LEADING_LETTER_PENALTY
                            ? MAX_LEADING_LETTER_PENALTY
                            : penalty;
                    outScore += penalty;
                    //Apply unmatched penalty
                    var unmatched = str.length - nextMatch;
                    outScore += UNMATCHED_LETTER_PENALTY * unmatched;
                    // Apply ordering bonuses
                    for (var i = 0; i < nextMatch; i++) {
                        var currIdx = matches[i];
                        if (i > 0) {
                            var prevIdx = matches[i - 1];
                            if (currIdx == prevIdx + 1) {
                                outScore += SEQUENTIAL_BONUS;
                            }
                        }
                        // Check for bonuses based on neighbor character value.
                        if (currIdx > 0) {
                            // Camel case
                            var neighbor = str[currIdx - 1];
                            var curr = str[currIdx];
                            if (neighbor !== neighbor.toUpperCase() &&
                                curr !== curr.toLowerCase()) {
                                outScore += CAMEL_BONUS;
                            }
                            var isNeighbourSeparator = neighbor == "_" || neighbor == " ";
                            if (isNeighbourSeparator) {
                                outScore += SEPARATOR_BONUS;
                            }
                        }
                        else {
                            // First letter
                            outScore += FIRST_LETTER_BONUS;
                        }
                    }
                    // Return best result
                    if (recursiveMatch && (!matched || bestRecursiveScore > outScore)) {
                        // Recursive score is better than "this"
                        matches = __spreadArray([], bestRecursiveMatches, true);
                        outScore = bestRecursiveScore;
                        return [true, outScore];
                    }
                    else if (matched) {
                        // "this" score is better than recursive
                        return [true, outScore];
                    }
                    else {
                        return [false, outScore];
                    }
                }
                return [false, outScore];
            }
            var matchedItems = options.filter(function (item) { return fuzzyMatch(textValue, item.title)[0] === true; });
            var sortedMatched = matchedItems.sort(function (a, b) {
                var aScore = fuzzyMatch(textValue, a.title)[1];
                var bScore = fuzzyMatch(textValue, b.title)[1];
                return bScore - aScore;
            }).map(function (item) { return item.item; });
            return sortedMatched;
        };
        // search box
        form.addField(new Form.Field.String('textInput', 'Search', null, null), null);
        // result box
        var searchResults = allItems; // list of tasks
        var searchResultTitles = itemTitles; // list of task names
        var popupMenu = new Form.Field.Option('menuItem', 'Results', searchResults, searchResultTitles.map(function (title) { return lib.truncateString(title, 150); }), firstSelected, null);
        popupMenu.allowsNull = true;
        popupMenu.nullOptionTitle = 'No Results';
        form.addField(popupMenu, null);
        var currentValue = '';
        // validation
        form.validate = function (formObject) {
            var textValue = formObject.values.textInput || '';
            if (textValue !== currentValue) {
                currentValue = textValue;
                // remove popup menu
                if (form.fields.some(function (field) { return field.key === 'menuItem'; })) {
                    form.removeField(form.fields.find(function (field) { return field.key === 'menuItem'; }));
                }
            }
            if (!form.fields.some(function (field) { return field.key === 'menuItem'; })) {
                // search using provided string
                var searchResults_1 = (matchingFunction === null) ? defaultMatcher(textValue) : (textValue !== '') ? matchingFunction(textValue) : allItems;
                var resultIndexes = [];
                var resultTitles = searchResults_1.map(function (item, index) {
                    return itemTitles[allItems.indexOf(item)];
                });
                // add new popup menu
                var popupMenu_1 = new Form.Field.Option('menuItem', 'Results', searchResults_1, resultTitles.map(function (title) { return lib.truncateString(title, 150); }), searchResults_1[0], null);
                form.addField(popupMenu_1, 1);
                return false;
            }
            else {
                var menuValue = formObject.values.menuItem;
                if (menuValue === undefined || String(menuValue) === 'null') {
                    return false;
                }
                return true;
            }
        };
        return form;
    };
    lib.allTasksFuzzySearchForm = function () {
        return lib.searchForm(flattenedTasks, flattenedTasks.map(function (t) { return lib.getTaskPath(t); }), null, null);
    };
    lib.remainingTasksFuzzySearchForm = function () {
        var remaining = flattenedTasks.filter(function (task) { return ![Task.Status.Completed, Task.Status.Dropped].includes(task.taskStatus); });
        return lib.searchForm(remaining, remaining.map(function (t) { return lib.getTaskPath(t); }), null, null);
    };
    lib.activeTagsFuzzySearchForm = function () {
        var activeTags = flattenedTags.filter(function (tag) { return tag.active; });
        return lib.searchForm(activeTags, activeTags.map(function (t) { return t.name; }), null, null);
    };
    lib.activeFoldersFuzzySearchForm = function () {
        var activeFolders = flattenedFolders.filter(function (folder) { return folder.status === Folder.Status.Active; });
        return lib.searchForm(activeFolders, activeFolders.map(function (f) { return f.name; }), null, null);
    };
    return lib;
})();
