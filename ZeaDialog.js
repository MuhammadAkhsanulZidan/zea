class ZeaDialog {
  constructor({
    title = "Are you sure?",
    message = "",
    body = null,
    actions = '',
    showCancel = true,
    showConfirm = true,
    size = "md",
    confirmClass = '',
    confirmText = "OK",
    cancelClass = '',
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    onClose,
    onOpen,
    height = "fit"
  }) {
    this.config = {
      title,
      message,
      body,
      actions,
      showCancel,
      showConfirm,
      size,
      confirmClass,
      confirmText,
      cancelClass,
      cancelText,
      onConfirm,
      onCancel,
      onClose,
      onOpen,
      height
    };

    this.overlay = null;
    this.dialog = null;
    this.escHandler = null;
  }

  show() {
    const {
      title, message, body, actions,
      showCancel, showConfirm,
      size, confirmClass, confirmText,
      cancelClass, cancelText,
      onConfirm, onCancel, onClose, onOpen,
      height
    } = this.config;

    const existingDialogs = document.querySelectorAll('.custom-dialog-overlay');
    const dialogIndex = existingDialogs.length;
    const baseZ = 50;
    const overlayZ = baseZ + dialogIndex * 2;
    const dialogZ = overlayZ + 1;

    this.overlay = document.createElement('div');
    this.overlay.className = 'custom-dialog-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center';
    this.overlay.style.zIndex = overlayZ;

    const sizeClasses = {
      sm: "max-w-sm",
      md: "max-w-md",
      lg: "max-w-2xl",
      xl: "max-w-4xl",
      full: "max-w-full mx-2 h-[calc(100%-1rem)]"
    };

    const heightClasses = {
      fit: "h-fit",
      full: "h-full"
    };

    this.dialog = document.createElement('div');
    this.dialog.className = `custom-dialog relative flex flex-col text-left bg-white rounded-lg shadow-lg p-4 w-full max-h-[90vh] ${sizeClasses[size] || sizeClasses.md} ${heightClasses[height] || heightClasses.fit}`;
    this.dialog.style.zIndex = dialogZ;

    // Close button
    const btnClose = document.createElement('button');
    btnClose.className = 'absolute top-2 right-2 text-gray-500 hover:text-red-500';
    btnClose.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    btnClose.onclick = () => this.close();

    // Title
    if (title) {
      const h3 = document.createElement('span');
      h3.className = 'text-base font-semibold mb-1 block';
      h3.textContent = title;
      this.dialog.appendChild(h3);
    }

    if (message) {
      const p = document.createElement('p');
      p.className = 'text-sm text-gray-600 mb-4';
      p.textContent = message;
      this.dialog.appendChild(p);
    }

    if (body) {
      if (typeof body === "string") {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex-1 overflow-y-auto min-h-0';
        wrapper.innerHTML = body;
        this.dialog.appendChild(wrapper);
      } else {
        this.dialog.appendChild(body);
      }
    }

    // Actions
    const buttons = document.createElement('div');

    if (!actions) {
      buttons.className = 'buttons flex justify-center gap-2 mt-2 shrink-0';
      if (showCancel) {
        const btnCancel = document.createElement('button');
        btnCancel.className = `text-sm px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 ${cancelClass}`;
        btnCancel.textContent = cancelText;
        btnCancel.onclick = () => {
          if (onCancel) onCancel();
          this.close();
        };
        buttons.appendChild(btnCancel);
      }

      if (showConfirm) {
        const btnOk = document.createElement('button');
        btnOk.className = `text-sm px-3 py-1 rounded bg-pinkBrand text-white hover:bg-pink-600 ${confirmClass}`;
        btnOk.textContent = confirmText;
        btnOk.onclick = () => {
          if (onConfirm) onConfirm();
          this.close();
        };
        buttons.appendChild(btnOk);
      }
    } else {
      buttons.className = 'w-full';
      buttons.innerHTML = actions;
    }

    this.dialog.appendChild(btnClose);
    this.dialog.appendChild(buttons);
    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);

    if (typeof onOpen === "function") {
      onOpen(this.dialog);
    }

    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.close();
    });

    this.escHandler = (e) => {
      const all = document.querySelectorAll('.custom-dialog-overlay');
      const top = all[all.length - 1];
      if (e.key === "Escape" && this.overlay === top) {
        this.close();
        document.removeEventListener("keydown", this.escHandler);
      }
    };
    document.addEventListener("keydown", this.escHandler);
  }

  close() {
    if (this.overlay) {
      this.overlay.remove();
      if (typeof this.config.onClose === "function") {
        this.config.onClose();
      }
      if (this.escHandler) {
        document.removeEventListener("keydown", this.escHandler);
      }
      this.overlay = null;
      this.dialog = null;
    }
  }
}

if (typeof window !== "undefined") {
  window.ZeaDialog = ZeaDialog;
}
export { ZeaDialog };
