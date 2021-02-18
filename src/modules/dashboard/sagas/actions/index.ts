import { all, call } from 'redux-saga/effects';

import paymentActionSaga from './payment';
import moveFundsActionSaga from './moveFunds';
import mintTokensActionSaga from './mintTokens';
import versionUpgradeActionSaga from './versionUpgrade';
import createDomainActionSaga from './createDomain';
import editDomainActionSaga from './editDomain';
import editColonyActionSaga from './editColony';

export default function* actionsSagas() {
  yield all([
    call(paymentActionSaga),
    call(moveFundsActionSaga),
    call(mintTokensActionSaga),
    call(versionUpgradeActionSaga),
    call(createDomainActionSaga),
    call(editDomainActionSaga),
    call(editColonyActionSaga),
  ]);
}
