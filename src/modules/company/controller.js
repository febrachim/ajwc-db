import { Country } from '../master/model/country';
import { Sector } from '../master/model/sector';
import { People } from '../people/model/people';
import { Hiring } from '../hiring/model/hiring';
import { Company } from './model/company';
import { CompanySector } from './model/company_sector';
import { Note } from '../desc/model/note';
import { Document } from '../desc/model/document';
import { capitalize, error, errorJSON, genReport } from '../core/utils';
import { Messages } from './messages';
import { Pipeline } from '../pipeline/model/pipeline';
import { PeopleCompany, CompanyStatus } from '../people/model/people_company';



const { companyMsg } = Messages;

export const CompanyController = {};
export default { CompanyController };

CompanyController.addView = async (req, res) => {
  const getSectors = Sector.getDropdown();
  const [sectors] = await Promise.all([getSectors]);
  res.render('company/views/createCompany', { sectors, link: '/companies', type: 'add' });
};

CompanyController.add = async (req, res, next) => {
  const { country_id, sector_ids: sectors = [], notes = [], business_desc } = req.body;

  const name = capitalize(req.body.name);

  const check = await Company.get({ name });

  if (check) return next(errorJSON('danger', companyMsg.create_duplicate(name)));

  const company = await Company.forge({ name, country_id, user_id: req.user.id, business_desc }).save();

  const insertNotes = notes.map(note => Note.forge({
    text: note,
    ref_id: company.get('id'),
    ref_type: 'companies',
    user_id: req.user.id,
  }).save());

  const insertSectors = sectors.map(id => CompanySector.forge({ company_id: company.get('id'), sector_id: id }).save());

  await Promise.all([...insertNotes, ...insertSectors]);

  req.resData = {
    input: {
      ref_id: company.get('id'),
      ref_type: 'companies',
      msg: companyMsg.create_success(name),
      redirect: '/companies',
    },
    link: '/upload' };
  return next();
};

CompanyController.editView = async (req, res, next) => {
  const getSectors = Sector.getDropdown();
  const company = await Company.get({ id: req.params.id }, ['companySectors',
    'country',
    { notes: qb => qb.where('deleted_at', null).orderBy('id', 'desc') },
    'notes.createdBy',
    { documents: qb => qb.where('deleted_at', null) },
    'documents.createdBy']);
  if (!company) return next(error('danger', companyMsg.not_found, '/companies'));
  const [sectors] = await Promise.all([getSectors]);
  res.render('company/views/createCompany', {
    sectors,
    link: '/companies',
    type: 'edit',
    notes: company.related('notes').serialize(),
    documents: company.related('documents').serialize(),
    company: company.serialize(),
  });
};

CompanyController.edit = async (req, res, next) => {
  const { country_id: countryId,
    sector_ids: sectors = [],
    notes = [],
    business_desc,
    deletedNote = [],
    deletedDoc = [],
    editedNote = [] } = req.body;

    const name = capitalize(req.body.name);

  const [check, company] = await Promise
    .all([Company.get({ name }), Company.get({ id: req.params.id })]);

  if ((check && check.get('id') !== company.get('id')) || !company) return next(errorJSON('danger', companyMsg.create_duplicate(name)));

  const deleteSectors = CompanySector.where('company_id', company.get('id')).destroy();

  const insertNotes = notes.map(note => Note.forge({
    text: note,
    ref_id: company.get('id'),
    ref_type: 'companies',
    user_id: req.user.id,
  }).save());

  const deleteNotes = deletedNote.map(id => Note.softDelete(id, req.user.id));
  // const deleteFiles = [];
  const deleteDocs = deletedDoc.map(doc => Document.softDelete(doc, req.user.id));
  const editNotes = editedNote.map(note => Note.edit(note, req.user.id));
  const updateCompany = Company.where({ id: req.params.id })
      .save({ name, business_desc, country_id: countryId, user_id: req.user.id }, { patch: true });
  await deleteSectors;
  const insertSectors = sectors.map(id => CompanySector.forge({ company_id: company.get('id'), sector_id: id }).save());
  await Promise.all([
    ...insertNotes,
    ...insertSectors,
    ...editNotes,
    ...deleteNotes,
    ...deleteDocs,
    // ...deleteFiles,
    updateCompany]);
  req.resData = {
    input: {
      ref_id: company.get('id'),
      ref_type: 'companies',
      msg: companyMsg.edit_success,
      redirect: '/companies',
    },
    link: '/upload' };
  return next();
};

CompanyController.detail = async (req, res, next) => {
  const getCompany = Company.get({ id: req.params.id }, [
    'country',
    { notes: qb => qb.where('deleted_at', null).orderBy('id', 'desc') },
    'notes.createdBy',
    { documents: qb => qb.where('deleted_at', null).orderBy('id', 'desc') },
    'documents.createdBy'
  ]);

  const page = 1
  const pageSize = 9999;

  // Get Current pipeline/deals
  const getPipeline = await Pipeline.get({ company_id: req.params.id }, [
    'stage', 'contacts', 'company', 'action', 'rating', 'status', 'userContact', 'priority', 'country', 'currency',
    { notes: qb => qb.where('deleted_at', null).orderBy('user_id').orderBy('id', 'desc') },
    'notes.createdBy', 'techCat',
    { documents: qb => qb.where('deleted_at', null) },
    'documents.createdBy']);

  let openingsQuery = { company: req.params.id }
  const getOpenings = Hiring.getOpenings(openingsQuery, { page, pageSize }, ['company', 'hiringStatus', 'createdBy']);

  const getSectors = Sector.findParents(req.params.id);

  // Get people in the company
  const getCurrentCompany = PeopleCompany.getAll({ company_id: req.params.id, status: CompanyStatus.CURRENT }, null, ['role', 'rel', 'company', 'people']);
  const getPastCompany = PeopleCompany.getAll({ company_id: req.params.id, status: CompanyStatus.PAST }, null, ['role', 'rel', 'company', 'people']);

  // PLease follow the order
  const [company, sectors, pipeline, openings, pastpeople, currentpeople] = await Promise.all([
      getCompany,
      getSectors,
      getPipeline,
      getOpenings,
      getPastCompany,
      getCurrentCompany
    ]);

  let dealsPipeline;

  let pastPeopleSerialize = pastpeople.serialize()
  let currentpeopleSerialize = currentpeople.serialize()
  let peopleInCompany = pastPeopleSerialize.concat(currentpeopleSerialize)

  if (pipeline != null) {
    dealsPipeline = pipeline.serialize({ formatCurr: true, formatStatus: true });
  } else {
    dealsPipeline = null
  }

  if (!company) return next(error('danger', companyMsg.not_found, '/companies'));
  res.render('company/views/detailCompany', {
    link: '/companies',
    notes: company.related('notes').serialize(),
    documents: company.related('documents').serialize(),
    company: company.serialize(),
    sectors: sectors.serialize({ api: true }),
    peoples: peopleInCompany,
    currentpeople: currentpeople.serialize(),
    pastpeople: pastpeople.serialize(),
    pipeline: dealsPipeline,
    pipelinesnotes: pipeline ? pipeline.related('notes').serialize() : null,
    pipelinesdocuments: pipeline ? pipeline.related('documents').serialize() : null,
    openings: openings.serialize({ job: true })
  });
};

CompanyController.viewAll = async (req, res) => {
  const { page = 1, countries, pageSize = 10, sort, order, sectors: sectorsQ = [] } = req.query;

  const getCompanies = Company.getAll(req.query, { page, pageSize }, ['sectors', 'country', 'createdBy']);

  const getCountries = countries
    ? Promise.all(req.query.countries.map(id => Country.get({ id }))) : [];

  const getSectors = Sector.getDropdown();

  const [companies, sectors, selectedCountries] = await
    Promise.all([getCompanies, getSectors, getCountries]);

    res.render('company/views/viewCompanies', {
    link: '/companies',
    items: companies.serialize(),
    sectors,
    title: 'Company',
    queries: req.query,
    ...companies.pagination,
    countries: selectedCountries,
    selectedSectors: sectorsQ,
    sort,
    order,
  });
};

CompanyController.export = async (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  const companies = await Company.getAll(req.query, { page, pageSize }, ['sectors', 'country', 'createdBy',
    { notes: qb => qb.where('deleted_at', null).orderBy('id', 'desc') },
    { documents: qb => qb.where('deleted_at', null) }]);
  const cols = ['Name', 'Sectors', 'Country', 'Created At', 'Edited At', 'Last Edited By', 'Notes', 'Documents'];
  const data = Company.formatExport(companies.serialize({ forExport: true }));
  const name = `Companies Page ${page}`;
  res.attachment(`${name.toLowerCase()}.xlsx`);
  return res.send(genReport(data, cols, name));
};

CompanyController.listCompany = async (req, res, next) => {
  const q = req.query.q;
  // console.log(q)
  const companies = await Company.getRegexWithSpace(q);
  // Bookhself returning a promise if not convert to JSON, you can do this with
  //  toJSON or serialize method on model
  console.log(companies.serialize({ api: true }))
  req.resData = { data: companies.serialize({ api: true }) };
  return next();
};

CompanyController.delete = async (req, res) => {
  const { id } = req.params;
  await Company.where({ id }).save({ deleted_at: new Date() }, { patch: true });
  req.flash('success', companyMsg.delete_success);
  return res.redirect('/companies');
};
