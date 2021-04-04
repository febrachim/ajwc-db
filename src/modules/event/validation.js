import { Messages } from './messages';

const { validateMsg } = Messages;

export const constraints = {};

constraints.createEvent = {
  name: { presence: true },
};

export default { constraints };
