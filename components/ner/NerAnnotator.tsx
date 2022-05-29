import React, { useState } from 'react';
import { entities, PageOcrData } from '../../interfaces/ner';
import EntityContext from '../../lib/ner/entityContext';
import NerPage from './NerPage';

type Props = {
    data: Blob;
    ocrData: PageOcrData;
    setPageOcrData?(ocrData: PageOcrData): void;
};

const NerAnnotator: React.FC<Props> = ({ data, ocrData, setPageOcrData }) => {
    const [selectedEntity, setSelectedEntity] = useState(-1);

    return (
        <div className="relative flex flex-row w-full space-x-6 h-[calc(100vh-5.5rem)] ">
            <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col items-center px-6 space-y-6">
                    <EntityContext.Provider value={{ entity: entities[selectedEntity] }}>
                        <NerPage data={data} pageOcrData={ocrData} setPageOcrData={setPageOcrData}></NerPage>
                    </EntityContext.Provider>
                </div>
            </div>
            <div className="flex-none overflow-y-auto">
                {entities.map((entity, index) => (
                    <div className="flex justify-center mb-1" key={entity.id}>
                        <span className="flex items-center justify-center w-10 h-8">{index + 1}</span>
                        <span
                            role="button"
                            className="p-2 font-medium text-center text-black cursor-pointer w-44 hover:bg-gray-100"
                            style={
                                selectedEntity === index || selectedEntity === -1
                                    ? { backgroundColor: entity.color }
                                    : { backgroundColor: '#405065' }
                            }
                            onClick={() => setSelectedEntity(selectedEntity !== index ? index : -1)}
                        >
                            {entity.name}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NerAnnotator;
