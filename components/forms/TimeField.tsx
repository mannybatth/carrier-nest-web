import * as React from 'react';
import { ChangeEvent, CSSProperties, ReactElement } from 'react';

const DEFAULT_COLON = ':';
const DEFAULT_VALUE_SHORT = `00${DEFAULT_COLON}00`;
const DEFAULT_VALUE_FULL = `00${DEFAULT_COLON}00${DEFAULT_COLON}00`;

export function isNumber<T>(value: T): boolean {
    const number = Number(value);
    return !isNaN(number) && String(value) === String(number);
}

export function formatTimeItem(value?: string | number): string {
    if (!value) {
        return '';
    }
    return `${value || ''}00`.substring(0, 2);
}

export function validateTimeAndCursor(
    showSeconds = false,
    value = '',
    defaultValue = '',
    colon = DEFAULT_COLON,
    cursorPosition = 0,
): [string, number] {
    if (!value) {
        colon = '';
    }

    const [oldH, oldM, oldS] = defaultValue.split(colon);

    let newCursorPosition = Number(cursorPosition);
    let [newH, newM, newS] = String(value).split(colon);

    newH = formatTimeItem(newH);
    if (Number(newH[0]) > 2) {
        newH = oldH;
        newCursorPosition -= 1;
    } else if (Number(newH[0]) === 2) {
        if (Number(oldH[0]) === 2 && Number(newH[1]) > 3) {
            newH = `2${oldH[1]}`;
            newCursorPosition -= 2;
        } else if (Number(newH[1]) > 3) {
            newH = '23';
        }
    }

    newM = formatTimeItem(newM);
    if (Number(newM[0]) > 5) {
        newM = oldM;
        newCursorPosition -= 1;
    }

    if (showSeconds) {
        newS = formatTimeItem(newS);
        if (Number(newS[0]) > 5) {
            newS = oldS;
            newCursorPosition -= 1;
        }
    }

    const validatedValue = showSeconds ? `${newH}${colon}${newM}${colon}${newS}` : `${newH}${colon}${newM}`;

    return [validatedValue, newCursorPosition];
}

type onChangeType = (event: ChangeEvent<HTMLInputElement>, value: string) => void;

interface Props {
    value?: string;
    onChange?: onChangeType;
    showSeconds?: boolean;
    input: ReactElement | null;
    inputRef?: React.RefObject<HTMLInputElement>;
    colon?: string;
    style?: CSSProperties | Record<string, unknown>;
}

interface State {
    value: string;
    _colon: string;
    _defaultValue: string;
    _showSeconds: boolean;
    _maxLength: number;
}

export default class TimeField extends React.Component<Props, State> {
    static defaultProps: Props = {
        showSeconds: false,
        input: null,
        style: {},
        colon: DEFAULT_COLON,
    };

    constructor(props: Props) {
        super(props);

        const _showSeconds = Boolean(props.showSeconds);
        const _defaultValue = _showSeconds ? DEFAULT_VALUE_FULL : DEFAULT_VALUE_SHORT;
        const _colon = props.colon && props.colon.length === 1 ? props.colon : DEFAULT_COLON;
        const [validatedTime] = validateTimeAndCursor(_showSeconds, this.props.value, _defaultValue, _colon);

        this.state = {
            value: validatedTime,
            _colon,
            _showSeconds,
            _defaultValue,
            _maxLength: _defaultValue.length,
        };

        this.onInputChange = this.onInputChange.bind(this);
    }

    componentDidUpdate(prevProps: Props): void {
        if (this.props.value !== prevProps.value) {
            const [validatedTime] = validateTimeAndCursor(
                this.state._showSeconds,
                this.props.value,
                this.state._defaultValue,
                this.state._colon,
            );
            this.setState({
                value: validatedTime,
            });
        }
    }

    onInputChange(event: ChangeEvent<HTMLInputElement>, callback: onChangeType): void {
        const oldValue = this.state.value;
        const inputEl = event.target;
        const inputValue = inputEl.value;
        const position = inputEl.selectionEnd || 0;
        const isTyped = inputValue.length > oldValue.length;
        const cursorCharacter = inputValue[position - 1];
        const addedCharacter = isTyped ? cursorCharacter : null;
        const removedCharacter = isTyped ? null : oldValue[position];
        const replacedSingleCharacter = inputValue.length === oldValue.length ? oldValue[position - 1] : null;
        const colon = this.state._colon;

        let newValue = oldValue;
        let newPosition = position;

        if (addedCharacter !== null) {
            if (position > this.state._maxLength) {
                newPosition = this.state._maxLength;
            } else if ((position === 3 || position === 6) && addedCharacter === colon) {
                newValue = `${inputValue.substring(0, position - 1)}${colon}${inputValue.substring(position + 1)}`;
            } else if ((position === 3 || position === 6) && isNumber(addedCharacter)) {
                newValue = `${inputValue.substring(0, position - 1)}${colon}${addedCharacter}${inputValue.substring(
                    position + 2,
                )}`;
                newPosition = position + 1;
            } else if (isNumber(addedCharacter)) {
                // user typed a number
                newValue = inputValue.substring(0, position - 1) + addedCharacter + inputValue.substring(position + 1);
                if (position === 2 || position === 5) {
                    newPosition = position + 1;
                }
            } else {
                // if user typed NOT a number, then keep old value & position
                newPosition = position - 1;
            }
        } else if (replacedSingleCharacter !== null) {
            // user replaced only a single character
            if (isNumber(cursorCharacter)) {
                if (position - 1 === 2 || position - 1 === 5) {
                    newValue = `${inputValue.substring(0, position - 1)}${colon}${inputValue.substring(position)}`;
                } else {
                    newValue = inputValue;
                }
            } else {
                // user replaced a number on some non-number character
                newValue = oldValue;
                newPosition = position - 1;
            }
        } else if (typeof cursorCharacter !== 'undefined' && cursorCharacter !== colon && !isNumber(cursorCharacter)) {
            // set of characters replaced by non-number
            newValue = oldValue;
            newPosition = position - 1;
        } else if (removedCharacter !== null) {
            if ((position === 2 || position === 5) && removedCharacter === colon) {
                newValue = `${inputValue.substring(0, position - 1)}0${colon}${inputValue.substring(position)}`;
                newPosition = position - 1;
            } else {
                // user removed a number
                newValue =
                    inputValue !== '' ? `${inputValue.substring(0, position)}0${inputValue.substring(position)}` : '';
            }
        }

        const [validatedTime, validatedCursorPosition] = validateTimeAndCursor(
            this.state._showSeconds,
            newValue,
            oldValue,
            colon,
            newPosition,
        );

        this.setState({ value: validatedTime }, () => {
            inputEl.selectionStart = validatedCursorPosition;
            inputEl.selectionEnd = validatedCursorPosition;
            callback(event, validatedTime);
        });

        event.persist();
    }

    render(): ReactElement {
        const { value } = this.state;
        const { onChange, style, showSeconds, input, inputRef, colon, ...props } = this.props; //eslint-disable-line no-unused-vars
        const onChangeHandler = (event: ChangeEvent<HTMLInputElement>) =>
            this.onInputChange(event, (e: ChangeEvent<HTMLInputElement>, v: string) => onChange && onChange(e, v));

        if (input) {
            return React.cloneElement(input, {
                ...props,
                value,
                style,
                onChange: onChangeHandler,
            });
        }

        return (
            <input
                type="text"
                {...props}
                ref={inputRef}
                value={value}
                onChange={onChangeHandler}
                style={{ width: showSeconds ? 54 : 35, ...style }}
            />
        );
    }
}
