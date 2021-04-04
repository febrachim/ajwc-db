import { Messages } from './messages';

const { validateMsg } = Messages;

export const constraints = {};

const number = { pattern: /^[0-9]+$/, message: validateMsg.number_format };

constraints.job = {
  company: { presence: true, format: number },
  position: { presence: true, format: String },
  hiring_status: { presence: true, format: number },
};

constraints.candidate = {
};

export default { constraints };
