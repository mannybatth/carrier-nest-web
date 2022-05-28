import { createContext } from 'react';
import { Entity } from '../../interfaces/ner';

interface EntityContextProps {
    entity?: Entity;
}

const EntityContext = createContext<EntityContextProps>({
    entity: undefined,
});

EntityContext.displayName = 'EntityContext';
export default EntityContext;
