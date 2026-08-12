import { Button } from '@carbon/react';

import type { FC } from 'react';

interface UploadReviewActionsProps {
  readonly isReviewing: boolean;
  readonly canSubmit: boolean;
  readonly isSubmitting: boolean;
  readonly isMutationPending: boolean;
  readonly hasData?: boolean;
  readonly onSubmit: () => void;
  readonly onBack: () => void;
  readonly onCancel: () => void;
  readonly uploadReady?: string;
}

const UploadReviewActions: FC<UploadReviewActionsProps> = ({
  isReviewing,
  canSubmit,
  isSubmitting,
  isMutationPending,
  hasData,
  onSubmit,
  onBack,
  onCancel,
  uploadReady,
}) => (
  <div className="button-group">
    {isReviewing ? (
      <Button kind="secondary" type="button" onClick={onBack}>
        Back
      </Button>
    ) : (
      <Button kind="secondary" type="button" onClick={onCancel} data-testid="cancel-button">
        Cancel
      </Button>
    )}
    <Button
      kind="primary"
      type="button"
      onClick={onSubmit}
      disabled={!canSubmit || isMutationPending || isSubmitting || hasData === false}
      data-testid="upload-table-button"
      data-upload-ready={uploadReady}
    >
      {isReviewing ? 'Save' : 'Upload table'}
    </Button>
  </div>
);

export default UploadReviewActions;
