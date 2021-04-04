import { Messages } from './messages';

const { validateMsg } = Messages;

export const constraints = {};

const number = { pattern: /^[0-9]+$/, message: validateMsg.number_format };

constraints.createPipeline = {
  company: { presence: true, format: number },
};

constraints.pipelineContact = {
};

export default { constraints };
