import { Button, ComposedModal, ModalBody, ModalHeader } from '@carbon/react';
import { Information } from '@carbon/icons-react';
import { type FC, useState } from 'react';

import type { FormulaNamespaceCatalog } from '@/services/formulaConfiguration.types';

import './index.scss';

interface FormulaVariableCatalogProps {
  catalog: readonly FormulaNamespaceCatalog[];
}

const FormulaVariableCatalog: FC<FormulaVariableCatalogProps> = ({ catalog }) => {
  const [isOpen, setIsOpen] = useState(false);

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
          <div className="formula-variable-catalog__namespaces">
            {catalog.map((namespace) => (
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
