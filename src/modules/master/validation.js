import { Messages } from './messages';

const { validateMsg } = Messages;

export const constraints = {};

constraints.name = {
  name: { presence: { message: validateMsg.name } },
};

export default { constraints };
