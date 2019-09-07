import React, { ReactNode, SyntheticEvent } from 'react';
import { MessageDescriptor, MessageValues } from 'react-intl';
import cx from 'classnames';

import asField from '../asField';
import InputLabel from '../InputLabel';
import InputStatus from '../InputStatus';
import { CleaveOptions } from './types';
import InputComponent from './InputComponent';
import styles from './Input.css';

interface Appearance {
  theme?: 'fat' | 'underlined' | 'minimal' | 'dotted';
  align?: 'right';
  direction?: 'horizontal';
  colorSchema?: 'dark' | 'grey' | 'transparent';
  helpAlign?: 'right';
  size?: 'small';
}

interface Props {
  /** Appearance object */
  appearance: Appearance;

  /** Connect to form state (will inject `$value`, `$id`, `$error`, `$touched`), is `true` by default */
  connect?: boolean;

  /** Just render the `<input>` element without label */
  elementOnly?: boolean;

  /** Add extension of input to the right of it, i.e. for ENS name */
  extensionString?: string | MessageDescriptor;

  /** Extra node to render on the top right in the label */
  extra?: ReactNode;

  /** Options for cleave.js formatting (see [this list](https://github.com/nosir/cleave.js/blob/master/doc/options.md)) */
  formattingOptions?: CleaveOptions;

  /** Input field name (form variable) */
  name: string;

  /** Help text (will appear next to label text) */
  help?: string | MessageDescriptor;

  /** Values for help text (react-intl interpolation) */
  helpValues?: MessageValues;

  /** Pass a ref to the `<input>` element */
  innerRef?: (ref: HTMLElement | null) => void;

  /** Label text */
  label: string | MessageDescriptor;

  /** Values for label text (react-intl interpolation) */
  labelValues?: MessageValues;

  /** Placeholder for input */
  placeholder?: string;

  /** Status text */
  status?: string | MessageDescriptor;

  /** Values for status text (react-intl interpolation) */
  statusValues?: MessageValues;

  /** @ignore Will be injected by `asField` */
  $id: string;

  /** @ignore Will be injected by `asField` */
  $error?: string;

  /** @ignore Will be injected by `asField` */
  $value?: string;

  /** @ignore Will be injected by `asField` */
  $touched?: boolean;

  /** @ignore Will be injected by `asField` */
  formatIntl: (
    text: string | MessageDescriptor,
    textValues?: MessageValues,
  ) => string;

  /** @ignore Will be injected by `asField` */
  onChange: (evt: SyntheticEvent<HTMLInputElement>) => void;

  /** @ignore Will be injected by `asField` */
  setValue: (val: any) => void;

  /** @ignore Will be injected by `asField` */
  setError: (val: any) => void;
}

const Input = ({
  appearance,
  elementOnly,
  extensionString,
  formattingOptions,
  formatIntl,
  help,
  extra,
  $id,
  innerRef,
  label,
  name,
  $value,
  $error,
  status,
  statusValues,
  onChange,
  /* eslint-disable @typescript-eslint/no-unused-vars */
  $touched,
  setValue,
  setError,
  connect,
  /* eslint-enable @typescript-eslint/no-unused-vars */
  ...props
}: Props) => {
  const inputProps = {
    appearance,
    'aria-invalid': $error ? true : null,
    formattingOptions,
    id: $id,
    innerRef,
    name,
    onChange,
    value: undefined,
    ...props,
  };

  // If there is an onChange handler, make it a controlled input
  if (onChange) {
    inputProps.value = $value;
  }

  if (elementOnly) {
    return <InputComponent {...inputProps} />;
  }
  const containerClasses = cx(styles.container, {
    [styles.containerHorizontal]: appearance.direction === 'horizontal',
  });
  return (
    <div className={containerClasses}>
      <InputLabel
        appearance={appearance}
        inputId={$id}
        label={label}
        error={$error}
        help={help}
        extra={extra}
      />
      <div className={styles.extensionContainer}>
        <InputComponent {...inputProps} />
        {extensionString && (
          <div className={styles.extension}>{formatIntl(extensionString)}</div>
        )}
      </div>
      <InputStatus
        appearance={appearance}
        status={status}
        statusValues={statusValues}
        error={$error}
      />
    </div>
  );
};

Input.displayName = 'Input';

Input.defaultProps = {
  appearance: {},
};

export default (asField({
  initialValue: '',
}) as any)(Input);
