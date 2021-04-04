export const Messages = {
  pipelineMsg: {
    create_success: 'Add deal success',
    create_duplicate: name => `<strong>${name}</strong> is already created`,
    not_found: 'Deal not found',
    edit_success: 'Edit deal success',
    delete_success: 'Delete deal success',
  },
  validateMsg: {
    country_id: '^Country needs to be selected',
    sector_ids: '^Sector needs to be selected',
    number_format: 'not a valid input',
    company_format: '^Company not a valid input',
    rating: 'not a valid input',
  },
};

export default { Messages };
