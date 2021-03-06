/* @flow */
import type { GetState, Dispatch, Action } from '../types';
import { specialNarrow } from '../utils/narrow';
import { tryUntilSuccessful } from '../utils/async';
import { getSubscriptions, getMessages, getStreams, getUsers, getRealmEmojis } from '../api';
import { refreshNotificationToken } from '../utils/notifications';
import { messageFetchSuccess } from '../message/messagesActions';
import { initSubscriptions } from '../subscriptions/subscriptionsActions';
import { initRealmEmojis } from '../emoji/realmEmojiActions';
import { initStreams } from '../streams/streamsActions';
import { initUsers } from '../users/usersActions';
import { getAuth, getActiveNarrow } from '../selectors';

import { INITIAL_FETCH_COMPLETE, SAVE_TOKEN_PUSH, DELETE_TOKEN_PUSH } from '../actionConstants';

export const initialFetchComplete = (): Action => ({
  type: INITIAL_FETCH_COMPLETE,
});

export const fetchEssentialInitialData = (): Action => async (
  dispatch: Dispatch,
  getState: GetState,
) => {
  const auth = getAuth(getState());
  const narrow = getActiveNarrow(getState());

  const [subscriptions, messages] = await Promise.all([
    await tryUntilSuccessful(() => getSubscriptions(auth)),
    await tryUntilSuccessful(() => getMessages(auth, 0, 10, 10, narrow, true)),
  ]);

  dispatch(messageFetchSuccess(messages, narrow, false, false, false, false, true));
  dispatch(initSubscriptions(subscriptions));
  dispatch(initialFetchComplete());
};

export const fetchRestOfInitialData = (pushToken: string): Action => async (
  dispatch: Dispatch,
  getState: GetState,
) => {
  const auth = getAuth(getState());
  const [streams, users, messages, realmEmoji] = await Promise.all([
    await tryUntilSuccessful(() => getStreams(auth)),
    await tryUntilSuccessful(() => getUsers(auth)),
    await tryUntilSuccessful(() =>
      getMessages(auth, Number.MAX_SAFE_INTEGER, 100, 0, specialNarrow('private')),
    ),
    await tryUntilSuccessful(() => getRealmEmojis(auth)),
  ]);
  dispatch(messageFetchSuccess(messages, specialNarrow('private')));
  dispatch(initStreams(streams));
  dispatch(initUsers(users));
  dispatch(initRealmEmojis(realmEmoji));
  if (auth.apiKey !== '' && pushToken === '') {
    refreshNotificationToken();
  }
};

export const deleteTokenPush = (): Action => ({
  type: DELETE_TOKEN_PUSH,
});

export const saveTokenPush = (pushToken: string): Action => ({
  type: SAVE_TOKEN_PUSH,
  pushToken,
});
