/* @flow */

import type { Node as ReactNode } from 'react';
import type { IntlShape, MessageDescriptor } from 'react-intl';

import React, { Component } from 'react';
import { Manager, Reference, Popper } from 'react-popper';
import { injectIntl } from 'react-intl';
import nanoid from 'nanoid';

import type { PopoverTrigger, ReactRef } from './types';

// eslint-disable-next-line import/no-cycle
import PopoverWrapper from './PopoverWrapper.jsx';

export type Placement =
  | 'auto'
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'top-start'
  | 'right-start'
  | 'top-start'
  | 'left-start'
  | 'top-end'
  | 'right-end'
  | 'top-end'
  | 'left-end';

// This might be an eslint hiccup. Don't know where this is unused
// eslint-disable-next-line react/no-unused-prop-types
type RefObj = { ref: ReactRef };

export type Appearance = {
  theme: 'dark',
};

type Props = {
  appearance?: Appearance,
  /** Child element to trigger the popover */
  children: React$Element<*> | PopoverTrigger,
  /** Whether the popover should close when clicking anywhere */
  closeOnOutsideClick?: boolean,
  /** Popover content */
  content:
    | ReactNode
    | MessageDescriptor
    | (({ close: () => void }) => ReactNode),
  /** Values for content (react-intl interpolation) */
  contentValues?: { [string]: string },
  /** Delay opening of popover for `openDelay` ms */
  openDelay?: number,
  /** Popover placement */
  placement?: Placement,
  /** Whether the reference element should retain focus when popover is open (only for `HTMLInputElements`) */
  retainRefFocus?: boolean,
  /** How the popover gets triggered. Won't work when using a render prop as `children` */
  trigger?: 'always' | 'hover' | 'click' | 'disabled',
  /** @ignore injected by `react-intl` */
  intl: IntlShape,
};

type State = {
  isOpen: boolean,
};

class Popover extends Component<Props, State> {
  refNode: ?HTMLElement;

  contentNode: ?HTMLElement;

  id: string;

  openTimeout: TimeoutID;

  static displayName = 'Popover';

  static defaultProps = {
    closeOnOutsideClick: true,
    placement: 'top',
  };

  constructor(props: Props) {
    super(props);
    this.id = nanoid();
    this.state = {
      isOpen: props.trigger === 'always',
    };
  }

  componentDidUpdate({ closeOnOutsideClick, trigger }, { isOpen: prevOpen }) {
    const { isOpen } = this.state;
    if (
      isOpen &&
      !prevOpen &&
      closeOnOutsideClick &&
      document.body &&
      (trigger === 'click' || !trigger)
    ) {
      document.body.addEventListener('click', this.handleOutsideClick, true);
    }
    if (!isOpen && prevOpen) {
      this.removeOutsideClickListener();
    }
  }

  componentWillUnmount() {
    this.removeOutsideClickListener();
  }

  removeOutsideClickListener = () => {
    if (document.body) {
      document.body.removeEventListener('click', this.handleOutsideClick, true);
    }
  };

  getChildProps = (ref: ReactRef) => {
    const { id } = this;
    const { children, trigger } = this.props;
    const childProps: {
      'aria-describedby': string,
      innerRef?: ReactRef,
      ref?: ReactRef,
    } = {
      'aria-describedby': id,
    };
    if (typeof children.type == 'function') {
      childProps.innerRef = ref;
    } else {
      childProps.ref = ref;
    }
    return Object.assign(
      {},
      childProps,
      trigger
        ? {
            hover: {
              onMouseEnter: this.requestOpen,
              onMouseLeave: this.close,
            },
            click: { onClick: this.toggle },
            disabled: null,
            always: null,
          }[trigger]
        : null,
    );
  };

  handleOutsideClick = (evt: MouseEvent) => {
    if (
      (evt.target instanceof Node &&
        this.contentNode &&
        this.contentNode.contains(evt.target)) ||
      (evt.target instanceof Node &&
        this.refNode &&
        this.refNode.contains(evt.target))
    ) {
      return;
    }
    this.close();
  };

  requestOpen = () => {
    const { isOpen } = this.state;
    const { openDelay } = this.props;
    if (isOpen) {
      return;
    }
    if (openDelay) {
      this.openTimeout = setTimeout(this.open.bind(this), openDelay);
      return;
    }
    this.open();
  };

  open = () => {
    this.setState({ isOpen: true });
  };

  close = () => {
    clearTimeout(this.openTimeout);
    this.setState({ isOpen: false });
  };

  toggle = () => {
    const { isOpen } = this.state;
    if (isOpen) {
      return this.close();
    }
    return this.requestOpen();
  };

  registerRefNode = (node: ?HTMLElement) => {
    this.refNode = node;
  };

  registerContentNode = (node: ?HTMLElement) => {
    this.contentNode = node;
  };

  handleBackdropKey = ({ key }: SyntheticKeyboardEvent<HTMLElement>) => {
    if (key === 'Escape') {
      this.close();
    }
  };

  handleWrapperFocus = () => {
    const { retainRefFocus } = this.props;
    if (retainRefFocus && this.refNode instanceof HTMLInputElement) {
      this.refNode.focus();
    }
  };

  renderReference = () => {
    const { children } = this.props;
    const { id, requestOpen, close, toggle } = this;

    if (typeof children == 'function') {
      return ({ ref }: RefObj) =>
        children({ ref, id, open: requestOpen, close, toggle });
    }
    return ({ ref }: RefObj) =>
      React.cloneElement(children, this.getChildProps(ref));
  };

  renderContent = () => {
    const {
      content,
      contentValues,
      intl: { formatMessage },
    } = this.props;
    if (typeof content == 'string') {
      return content;
    }
    if (typeof content == 'function') {
      return content({ close: this.close });
    }
    if (React.isValidElement(content)) {
      return content;
    }
    // How to tell flow that this can only be a MessageDescriptor in this case?
    // $FlowFixMe - might be related to https://github.com/facebook/flow/issues/4775
    return formatMessage(content, contentValues);
  };

  render() {
    const { appearance, placement: origPlacement, retainRefFocus } = this.props;
    const { isOpen } = this.state;
    return (
      <Manager>
        <Reference innerRef={this.registerRefNode}>
          {this.renderReference()}
        </Reference>
        {isOpen && (
          <Popper innerRef={this.registerContentNode} placement={origPlacement}>
            {({ ref, style, placement, arrowProps }) => (
              // $FlowFixMe see above renderContent
              <PopoverWrapper
                appearance={{ ...appearance, placement }}
                id={this.id}
                innerRef={ref}
                style={style}
                placement={placement}
                arrowProps={arrowProps}
                onFocus={this.handleWrapperFocus}
                retainRefFocus={retainRefFocus}
              >
                {this.renderContent()}
              </PopoverWrapper>
            )}
          </Popper>
        )}
      </Manager>
    );
  }
}

export default injectIntl(Popover);
