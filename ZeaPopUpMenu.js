export class ZeaPopupMenu {
  static currentInstance = null;

  constructor({ actions = [], className = '', container = document.body } = {}) {
    this.container = container;
    this.actions = actions;

    this.menu = document.createElement('div');
    this.menu.className = `absolute z-[9999] bg-white border rounded shadow-md text-sm hidden ${className}`;
    this.menu.style.minWidth = '140px';
    this.menu.style.position = 'absolute';

    this.container.appendChild(this.menu);
    this.attachGlobalListeners();
  }

  attachGlobalListeners() {
    document.addEventListener('click', (e) => {
      if (!this.menu.contains(e.target)) this.hide();
    });
  }

  setActions(actions) {
    this.actions = actions;
  }

  show(x, y, context = {}) {
    // Hide previously open menu
    if (ZeaPopupMenu.currentInstance && ZeaPopupMenu.currentInstance !== this) {
      ZeaPopupMenu.currentInstance.hide();
    }

    ZeaPopupMenu.currentInstance = this;

    this.menu.innerHTML = '';

    this.actions.forEach(action => {
      const item = document.createElement('div');
      item.className = 'px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2';
      item.innerHTML = `<i class="${action.icon} w-4 text-gray-500"></i> <span>${action.label}</span>`;
      item.addEventListener('click', () => {
        action.onClick?.(context);
        this.hide();
      });
      this.menu.appendChild(item);
    });

    if (context?.target) {
      const rect = context.target.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

      this.menu.style.left = `${rect.right + scrollLeft}px`;
      this.menu.style.top = `${rect.top + scrollTop}px`;
    } else {
      this.menu.style.left = `${x}px`;
      this.menu.style.top = `${y}px`;
    }

    this.menu.classList.remove('hidden');
    this.menu.style.display = 'block';
  }

  hide() {
    this.menu.classList.add('hidden');
    this.menu.style.display = 'none';

    // Clear global reference
    if (ZeaPopupMenu.currentInstance === this) {
      ZeaPopupMenu.currentInstance = null;
    }
  }
}
