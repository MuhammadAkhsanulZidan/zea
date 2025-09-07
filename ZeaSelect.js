export class ZeaSelect {
  constructor({
    selector,
    element,
    placeholder = '',
    valueField = '',
    labelField = '',
    searchField = [],
    loadData,
    optionRender,
    itemRender,
    onItemAdd,
    onChange,
    autoLoad = false,
    dropdownMode = 'absolute',   // "inline" | "absolute"
    zIndex = 9999                // configurable z-index
  }) {
    let el = selector ? document.querySelector(selector) : element;
    if (!el) return;

    if (el._customSelect) {
      el._customSelect.destroy();
    }

    let allItems = {};
    let selectedValue = null;
    let previousValue = null;
    let previousLabel = null;
    let dropdownVisible = false;
    let rafId = null;

    const wrapper = document.createElement('div');
    wrapper.className = "relative w-full";
    el.replaceWith(wrapper);

    const inputContainer = document.createElement('div');
    inputContainer.className = "flex items-center w-full text-xs px-3 py-1 border border-gray-300 rounded focus-within:ring-2 focus-within:ring-primary";
    inputContainer.style.gap = "0.25rem";
    inputContainer.style.backgroundColor = "#fff";
    inputContainer.style.cursor = "text";
    wrapper.appendChild(inputContainer);

    const input = document.createElement('input');
    input.type = "text";
    input.placeholder = placeholder;
    input.className = "flex-1 border-none outline-none text-xs";
    inputContainer.appendChild(input);

    const clearBtn = document.createElement('span');
    clearBtn.innerHTML = '&times;';
    clearBtn.className = "text-gray-400 cursor-pointer hidden select-none";
    inputContainer.appendChild(clearBtn);

    clearBtn.addEventListener('click', () => {
      selectedValue = null;
      input.value = '';
      clearBtn.classList.add('hidden');
      if (typeof onChange === "function") onChange.call(api, allItems);
    });

    const dropdown = document.createElement('div');
    dropdown.className = "bg-white border border-gray-300 rounded mt-1 max-h-48 overflow-y-auto hidden text-xs";
    dropdown.style.zIndex = zIndex;

    // Append depending on mode
    if (dropdownMode === 'inline') {
      wrapper.appendChild(dropdown);
    } else if (dropdownMode === 'absolute') {
      document.body.appendChild(dropdown);
      dropdown.style.position = 'absolute';
    }

    // ONLY for absolute mode: dynamic positioning
    const updateDropdownPosition = () => {
      if (!dropdownVisible || dropdownMode !== 'absolute') return;
      const rect = inputContainer.getBoundingClientRect();
      dropdown.style.left = `${rect.left + window.scrollX}px`;
      dropdown.style.top = `${rect.bottom + window.scrollY}px`;
      dropdown.style.minWidth = `${rect.width}px`;
    };

    const startTracking = () => {
      if (dropdownMode !== 'absolute') return;
      const track = () => {
        updateDropdownPosition();
        rafId = requestAnimationFrame(track);
      };
      track();
    };

    const stopTracking = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const closeDropdown = () => {
      dropdown.classList.add("hidden");
      dropdownVisible = false;
      stopTracking();
    };

    const openDropdown = () => {
      if (dropdownMode === 'absolute') updateDropdownPosition();
      dropdown.classList.remove("hidden");
      dropdownVisible = true;
      startTracking();
    };

    const renderOptions = (itemsArray) => {
      selectedValue = null;
      dropdown.innerHTML = '';
      if (!itemsArray.length) {
        dropdown.innerHTML = '<div class="px-3 py-2 text-gray-400">No results</div>';
        return;
      }
      itemsArray.forEach(item => {
        allItems[item[valueField]] = item;
        const optionEl = document.createElement('div');
        optionEl.className = "px-3 py-1 cursor-pointer hover:bg-gray-100";
        optionEl.innerHTML = optionRender ? optionRender(item, allItems) : (item[labelField] || '');
        optionEl.addEventListener('click', () => {
          selectedValue = item[valueField];
          input.value = itemRender ? itemRender(item, allItems) : (item[labelField] || '');
          clearBtn.classList.remove('hidden');
          closeDropdown();
          if (typeof onItemAdd === "function") {
            onItemAdd.call(api, selectedValue, allItems);
          }
          if (typeof onChange === "function") {
            onChange.call(api, selectedValue, allItems);
          }
        });
        dropdown.appendChild(optionEl);
      });
    };

    const doSearch = (query) => {
      if (!autoLoad && !query.length) {
        renderOptions([]);
        return;
      }
      Promise.resolve(loadData(query)).then(data => {
        allItems = {};
        renderOptions(data || []);
      }).catch(() => {
        renderOptions([]);
      });
    };

    input.addEventListener('focus', () => {
      previousLabel = input.value;
      previousValue = selectedValue;
      if (autoLoad) doSearch('');
      openDropdown();
    });

    input.addEventListener('input', (e) => {
      doSearch(e.target.value);
      openDropdown();
    });

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target) && e.target !== dropdown) {
        if (!selectedValue) {
          input.value = previousLabel;
          selectedValue = previousValue;
        }
        closeDropdown();
      }
    });

    const api = {
      setValue: (val) => {
        selectedValue = val;
        const selectedOption = allItems[val];
        if (selectedOption) {
          input.value = selectedOption[labelField];
          clearBtn.classList.remove('hidden');
        } else {
          input.value = '';
          clearBtn.classList.add('hidden');
        }
      },
      addOption: (item) => {
        allItems[item[valueField]] = item;
        renderOptions(Object.values(allItems));
      },
      destroy: () => {
        stopTracking();
        if (dropdownMode === 'absolute') {
          dropdown.remove();
        }
        wrapper.replaceWith(el);
        el._customSelect = null;
      },
      getValue: () => selectedValue,
      get options() { return allItems; }
    };

    el._customSelect = api;
    return api;
  }
}
