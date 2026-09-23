import { Information } from '@carbon/icons-react';
import { Button, ComposedModal, ModalBody, ModalHeader, Search } from '@carbon/react';
import { type FC, useState } from 'react';

import type { FormulaNamespaceCatalog } from '@/services/formulaConfiguration.types.ts';

import './index.scss';

interface FormulaVariableCatalogProps {
  catalog: readonly FormulaNamespaceCatalog[];
}

const FormulaVariableCatalog: FC<FormulaVariableCatalogProps> = ({ catalog }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const filteredCatalog = catalog
    .map((namespace) => ({
      ...namespace,
      variables: namespace.variables.filter((variable) =>
        [variable.path, variable.label, variable.value?.toString()].some((value) =>
          value?.toLowerCase().includes(normalizedQuery),
        ),
      ),
    }))
    .filter(
      (namespace) =>
        !normalizedQuery ||
        [namespace.prefix, namespace.label, namespace.description].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        ) ||
        namespace.variables.length > 0,
    );

  return (
    <>
      <Button
        kind="ghost"
        renderIcon={Information}
        size="sm"
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
      >
        View formula variables
      </Button>
      <ComposedModal
        className="formula-variable-catalog"
        data-testid="formula-variable-catalog-modal"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        size="lg"
        selectorPrimaryFocus=".cds--modal-close"
      >
        <ModalHeader
          className="formula-variable-catalog__header"
          title="Formula variables"
          label="Available in formulas"
          closeModal={() => setIsOpen(false)}
        />
        <ModalBody>
          <p className="formula-variable-catalog__description">
            Use these grammar-approved variables in your formulas.
          </p>
          <Search
            labelText="Search formula variables"
            placeholder="Search by namespace, variable, label, or value"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          <div className="formula-variable-catalog__namespaces">
            {filteredCatalog.map((namespace) => (
              <details className="formula-variable-catalog__namespace" key={namespace.prefix}>
                <summary>
                  <span className="formula-variable-catalog__prefix">{namespace.prefix}.*</span>
                  <span>{namespace.label}</span>
                </summary>
                <p className="formula-variable-catalog__namespace-description">
                  {namespace.description}
                </p>
                {namespace.availability === 'SUBMISSION' ? (
                  <p className="formula-variable-catalog__availability">
                    Provided during submission
                  </p>
                ) : (
                  <ul className="formula-variable-catalog__variables">
                    {namespace.variables.map((variable) => (
                      <li key={variable.path}>
                        <code>{variable.path}</code>
                        <span>{variable.label}</span>
                        <output aria-label={`${variable.path} value`}>
                          {variable.value ?? 'Not available'}
                        </output>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            ))}
          </div>
        </ModalBody>
      </ComposedModal>
    </>
  );
};

export default FormulaVariableCatalog;
