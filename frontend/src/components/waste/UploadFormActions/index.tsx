import type { FC, FunctionComponent, ReactNode } from 'react';

import UploadReviewActions from '@/components/waste/UploadReviewActions';

interface UploadFormLike {
  readonly Subscribe: (props: {
    readonly selector?: (state: {
      readonly canSubmit: boolean;
      readonly isSubmitting: boolean;
    }) => [boolean, boolean];
    readonly children: ((state: [boolean, boolean]) => ReactNode) | ReactNode;
  }) => ReturnType<FunctionComponent>;
}

interface UploadFormActionsProps {
  readonly form: UploadFormLike;
  readonly isReviewing: boolean;
  readonly isMutationPending: boolean;
  readonly onSubmit: () => void;
  readonly onBack: () => void;
  readonly onCancel: () => void;
  readonly hasData?: boolean;
  readonly uploadReady?: string;
}

const UploadFormActions: FC<UploadFormActionsProps> = ({
  form,
  isReviewing,
  isMutationPending,
  onSubmit,
  onBack,
  onCancel,
  hasData,
  uploadReady,
}) => (
  <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
    {([canSubmit, isSubmitting]) => (
      <UploadReviewActions
        isReviewing={isReviewing}
        canSubmit={canSubmit}
        isSubmitting={isSubmitting}
        isMutationPending={isMutationPending}
        hasData={hasData}
        uploadReady={uploadReady}
        onSubmit={onSubmit}
        onBack={onBack}
        onCancel={onCancel}
      />
    )}
  </form.Subscribe>
);

export default UploadFormActions;
