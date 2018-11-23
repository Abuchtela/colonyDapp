/* @flow */

import { compose } from 'recompose';

import { withWizard } from '../../../core/components/Wizard';
import CreateColony from './CreateColonyWizard.jsx';
import StepTokenChoice from './StepTokenChoice.jsx';
import StepColonyName from './StepColonyName.jsx';
import StepSelectToken from './StepSelectToken.jsx';
import StepCreateToken from './StepCreateToken.jsx';
import StepCreateColony from './StepCreateColony.jsx';

const stepArray = [StepColonyName, StepTokenChoice, StepCreateColony];

type StepValues = {
  tokenChoice: 'create' | 'select',
};

// This is a step function to allow the wizard flow to branch
// off into two instead of just stepping through an array in a linear manner
const stepFunction = (step: number, { tokenChoice }: StepValues) => {
  if (step === 2) {
    if (tokenChoice === 'create') return StepCreateToken;
    if (tokenChoice === 'select') return StepSelectToken;
  }
  if (step === 3) return StepCreateColony;
  return stepArray[step];
};

const CreateColonyContainer = compose(
  withWizard({
    steps: stepFunction,
    stepCount: 4,
  }),
)(CreateColony);

export default CreateColonyContainer;
