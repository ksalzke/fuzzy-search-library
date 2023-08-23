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
        // search box
        form.addField(new Form.Field.String('textInput', 'Search', null, null), null);
        // result box
        var searchResults = allItems; // list of tasks
        var searchResultTitles = itemTitles; // list of task names
        var popupMenu = new Form.Field.Option('menuItem', 'Results', searchResults, searchResultTitles.map(function (title) { return lib.truncateString(title, 70); }), firstSelected, null);
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
                var searchResults_1 = (matchingFunction === null) ? allItems.filter(function (_, index) { return itemTitles[index].toLowerCase().includes(textValue.toLowerCase()); }) : (textValue !== '') ? matchingFunction(textValue) : allItems;
                var resultIndexes_1 = [];
                var resultTitles = searchResults_1.map(function (item, index) {
                    resultIndexes_1.push(index);
                    return itemTitles[allItems.indexOf(item)];
                });
                // add new popup menu
                var popupMenu_1 = new Form.Field.Option('menuItem', 'Results', searchResults_1, resultTitles.map(function (title) { return lib.truncateString(title, 70); }), searchResults_1[0], null);
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
    return lib;
})();
