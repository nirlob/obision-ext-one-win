import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class ObisionExtGridPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        // Create a preferences page
        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'view-grid-symbolic',
        });
        window.add(page);

        // Keyboard Shortcut Group
        const shortcutsGroup = new Adw.PreferencesGroup({
            title: 'Keyboard Shortcut',
            description: 'Configure keyboard shortcut',
        });
        page.add(shortcutsGroup);

        // Toggle One UI Shortcut
        const getShortcutText = () => {
            try {
                const shortcuts = settings.get_strv('toggle-grid');
                const rawShortcut = (shortcuts && shortcuts.length > 0) ? shortcuts[0] : '<Super>g';
                return this._formatShortcut(rawShortcut);
            } catch (e) {
                return this._formatShortcut('<Super>g');
            }
        };

        const shortcutRow = new Adw.ActionRow({
            title: 'Toggle One UI',
            subtitle: 'Show or hide the window manager panel',
        });

        const shortcutLabel = new Gtk.Label({
            label: getShortcutText(),
            valign: Gtk.Align.CENTER,
        });
        shortcutLabel.add_css_class('dim-label');
        shortcutRow.add_suffix(shortcutLabel);

        const shortcutButton = new Gtk.Button({
            label: 'Set',
            valign: Gtk.Align.CENTER,
        });
        shortcutButton.connect('clicked', () => {
            this._showShortcutDialog(window, settings, shortcutRow, shortcutLabel);
        });
        shortcutRow.add_suffix(shortcutButton);
        shortcutsGroup.add(shortcutRow);
    }

    _showShortcutDialog(window, settings, row, label) {
        const dialog = new Adw.MessageDialog({
            heading: 'Set Keyboard Shortcut',
            body: 'Press the key combination you want to use',
            transient_for: window,
            modal: true,
        });

        dialog.add_response('cancel', 'Cancel');
        dialog.add_response('clear', 'Clear');
        dialog.set_response_appearance('clear', Adw.ResponseAppearance.DESTRUCTIVE);

        const controller = new Gtk.EventControllerKey();
        controller.connect('key-pressed', (controller, keyval, keycode, state) => {
            const mask = state & Gtk.accelerator_get_default_mod_mask();

            if (keyval && mask) {
                try {
                    const shortcut = Gtk.accelerator_name(keyval, mask);
                    if (shortcut) {
                        settings.set_strv('toggle-grid', [shortcut]);
                        label.set_label(this._formatShortcut(shortcut));
                        dialog.close();
                        return true;
                    }
                } catch (e) {
                    log(`Error setting shortcut: ${e}`);
                }
            }
            return false;
        });
        dialog.add_controller(controller);

        dialog.connect('response', (dialog, response) => {
            if (response === 'clear') {
                try {
                    settings.set_strv('toggle-grid', ['<Super>g']);
                    label.set_label(this._formatShortcut('<Super>g'));
                } catch (e) {
                    log(`Error setting shortcut: ${e}`);
                }
            }
            dialog.close();
        });

        dialog.present();
    }

    _formatShortcut(shortcut) {
        // GTK format is like: <Super>g, <Primary><Shift>t, etc.
        // We want: Super+G, Ctrl+Shift+T, etc.

        // Split by < and > to get individual parts
        const parts = shortcut.split(/[<>]/).filter(part => part.length > 0);

        // Process each part
        const formatted = parts.map(part => {
            // Replace Primary with Ctrl
            if (part === 'Primary') {
                return 'Ctrl';
            }
            // Capitalize single letter keys
            if (part.length === 1) {
                return part.toUpperCase();
            }
            // Keep modifiers as-is (Super, Shift, Alt, etc.)
            return part;
        });

        // Join with +
        return formatted.join('+');
    }
}
