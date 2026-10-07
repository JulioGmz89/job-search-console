/**
 * ui.jsx — the small shared pieces every page is built from (ia.md §3).
 *
 * Interactive primitives with real keyboard and focus behaviour come from
 * React Aria (decision D-2): the confirm dialog, menus and selects. Everything
 * else is plain HTML with the classes in app.css.
 */

import {
  Button as AriaButton,
  Dialog,
  Heading,
  Label,
  ListBox,
  ListBoxItem,
  Menu as AriaMenu,
  MenuItem,
  MenuTrigger,
  Modal,
  ModalOverlay,
  Popover,
  Select,
  SelectValue,
  Separator,
} from 'react-aria-components';

/** A small coloured label above a card's heading: "Needs you · a fit check didn't finish". */
export function Tag({ tone = 'info', children }) {
  return <span className={`tag ${tone}`}>{children}</span>;
}

/** An inline message. `live` makes it a polite status region. */
export function Notice({ tone = 'info', live = false, children, id }) {
  return (
    <div className={`notice ${tone}`} id={id} {...(live ? { role: 'status' } : {})}>
      {children}
    </div>
  );
}

/** An indeterminate bar for work that takes minutes; named so it is not just decoration. */
export function Progress({ label }) {
  return (
    <div className="progress" role="progressbar" aria-label={label} aria-valuetext="Working">
      <span />
    </div>
  );
}

/** A page or section with nothing in it yet: what it is for, and what to do first (F-012). */
export function EmptyState({ title, children, actions = null, headingLevel = 2 }) {
  const H = `h${headingLevel}`;
  return (
    <section className="card empty">
      <H className="card-title">{title}</H>
      {children}
      {actions ? <div className="row">{actions}</div> : null}
    </section>
  );
}

/** "?" beside a control, opening the help topic. */
export function HelpLink({ topic, children }) {
  return (
    <a className="help-link" href={`#/help/${topic}`}>
      {children}
    </a>
  );
}

/** The cost line beside every button that calls the assistant (ia.md §3 "Costs and slips"). */
export function CostNote({ minutes = '2–5', children = null }) {
  return (
    <span className="hint inline">
      About {minutes} min · uses your Claude plan
      {children}
    </span>
  );
}

/** A labelled form field with its hint and error wired to the input. */
export function Field({ id, label, hint = null, error = null, children, required = false }) {
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required ? <span className="req"> (required)</span> : null}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error ? (
        <p className="error" id={`${id}-err`}>
          {error}
        </p>
      ) : null}
      {hint ? (
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A confirmation for anything that replaces or removes (ia.md §3). A modal
 * dialog: focus is trapped inside, Escape cancels, and focus returns to what
 * opened it (F-020).
 */
export function ConfirmDialog({ isOpen, title, children, confirmLabel, cancelLabel = 'Cancel', danger = false, onConfirm, onCancel, busy = false, focusConfirm = !danger }) {
  return (
    <ModalOverlay isOpen={isOpen} onOpenChange={(open) => !open && onCancel()} isDismissable className="modal-overlay">
      <Modal className="modal">
        <Dialog role="alertdialog" className="dialog">
          <Heading slot="title" className="dialog-title">
            {title}
          </Heading>
          <div className="stack-sm">{children}</div>
          <div className="row dialog-actions">
            {/* A destructive choice is never the default: focus starts on Cancel. */}
            <AriaButton className={danger ? 'btn-danger' : 'btn'} onPress={onConfirm} isDisabled={busy} autoFocus={focusConfirm}>
              {confirmLabel}
            </AriaButton>
            <AriaButton className="btn2" onPress={onCancel} autoFocus={danger}>
              {cancelLabel}
            </AriaButton>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

/**
 * A menu of actions on one item. `label` names the item so repeated menus are
 * told apart ("Actions for Granite Cloud — Software Engineer").
 *
 * @param {{label: string, text?: string, items: Array<{id: string, label: string, disabled?: boolean, separator?: boolean}>, onAction: (id: string) => void, align?: 'start'|'end'}} props
 */
export function ActionMenu({ label, text = 'Actions', items, onAction, align = 'end' }) {
  const disabledKeys = items.filter((i) => i.disabled).map((i) => i.id);
  return (
    <MenuTrigger>
      <AriaButton className="menu-btn" aria-label={label}>
        {text} <span aria-hidden="true">▾</span>
      </AriaButton>
      <Popover className="popover" placement={align === 'end' ? 'bottom end' : 'bottom start'}>
        <AriaMenu className="menu" onAction={(key) => onAction(String(key))} disabledKeys={disabledKeys} aria-label={label}>
          {items.map((item) =>
            item.separator ? (
              <Separator key={item.id} className="menu-sep" />
            ) : (
              <MenuItem key={item.id} id={item.id} className="menu-item" textValue={item.label}>
                {item.label}
              </MenuItem>
            ),
          )}
        </AriaMenu>
      </Popover>
    </MenuTrigger>
  );
}

/**
 * A select that commits only when an option is chosen, never on the first
 * arrow key (F-022). `label` is the accessible name, naming the item.
 *
 * @param {{label: string, visibleLabel?: boolean, value: string, options: Array<{id: string, label: string}>, onChange: (id: string) => void, isDisabled?: boolean}} props
 */
export function ChoiceSelect({ label, visibleLabel = false, value, options, onChange, isDisabled = false, className = '' }) {
  return (
    <Select
      className={`choice ${className}`}
      selectedKey={value}
      onSelectionChange={(key) => key !== value && onChange(String(key))}
      isDisabled={isDisabled}
      aria-label={visibleLabel ? undefined : label}
    >
      {visibleLabel ? <Label className="label">{label}</Label> : null}
      <AriaButton className="menu-btn choice-btn">
        <SelectValue />
        <span aria-hidden="true">▾</span>
      </AriaButton>
      <Popover className="popover">
        <ListBox className="menu" items={options}>
          {(option) => (
            <ListBoxItem id={option.id} className="menu-item" textValue={option.label}>
              {option.label}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </Select>
  );
}
