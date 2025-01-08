import React from 'react';
import { Popover } from '@headlessui/react';

const HoverPopover: React.FC<{
    trigger: React.ReactNode;
    content: React.ReactNode;
}> = ({ trigger, content }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <Popover>
            <div>
                <div onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
                    {trigger}
                </div>

                {isOpen && (
                    <Popover.Panel static className="absolute z-10 w-64 p-4 mt-1 bg-white border rounded-md shadow-lg">
                        {content}
                    </Popover.Panel>
                )}
            </div>
        </Popover>
    );
};

export default HoverPopover;
