import { Switch } from '@headlessui/react';

interface SwitchWithLabelProps {
    label?: string;
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
    border?: boolean;
}

const SwitchWithLabel: React.FC<SwitchWithLabelProps> = ({ label, checked, onChange, disabled, border = true }) => {
    return (
        <div
            className={`flex items-center justify-between p-2 gap-2 rounded-lg shadow-none ${
                border ? 'border border-gray-200' : ''
            }   bg-white max-w-md mx-auto`}
        >
            {label && (
                <div className="text-left">
                    <p className="text-sm text-gray-500 truncate">{label}</p>
                </div>
            )}

            <Switch
                checked={checked}
                onChange={onChange}
                className={`${
                    checked ? 'bg-gray-600' : 'bg-gray-300'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none`}
            >
                <span
                    className={`${
                        checked ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200`}
                />
            </Switch>
        </div>
    );
};

export default SwitchWithLabel;
