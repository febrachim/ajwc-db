// import fs from 'fs-extra';
import { Stage } from '../master/model/stage';
import { Action } from '../master/model/action';
import { Pipeline } from './model/pipeline';
import { Contact } from './model/contact';
import { People } from '../people/model/people';
import { Sector } from '../master/model/sector';
import { User } from '../user/model/user';
import { PipelineExtra, PipelineExtraType } from '../master/model/pipeline_extras';
import { Note } from '../desc/model/note';
import { Document } from '../desc/model/document';
import { Company } from '../company/model/company';
import { error, formatDate, genReport } from '../core/utils';
import { Messages } from './messages';

const { pipelineMsg } = Messages;

export const PipelineController = {};
export default { PipelineController };

PipelineController.addView = async (req, res) => {
  const getStages = Stage.getAll();
  const getActions = Action.getAll();
  const getRatings = PipelineExtra.getAll({ type: PipelineExtraType.RATING });
  const getStatuses = PipelineExtra.getAll({ type: PipelineExtraType.PIPELINE });
  const getPriorities = PipelineExtra.getAll({ type: PipelineExtraType.PRIORITY });
  const getCurrencies = PipelineExtra.getAll({ type: PipelineExtraType.CURRENCY });
  const getSectors = Sector.getDropdown();
  const [stages, actions, ratings, statuses, sectors, priorities, currencies] = await Promise.all([
    getStages, getActions, getRatings, getStatuses, getSectors, getPriorities, getCurrencies]);
  res.render('pipeline/views/createPipeline', {
    ratings: ratings.serialize(),
    statuses: statuses.serialize(),
    stages: stages.serialize(),
    actions: actions.serialize(),
    priorities: priorities.serialize(),
    currencies: currencies.serialize(),
    sectors,
    link: '/pipelines',
    type: 'add' });
};

PipelineController.add = async (req, res, next) => {
  const { company, stage, fundraise, fund_open: fo, priority, tech_cat, sector, country,
    premoney, rating, contacts, status, action, notes, user_contact: uc,
    invest_note, next_step, currency } = req.body;

  console.log(req.body)

  const pipeline = await Pipeline.forge({
    company_id: company,
    fundraise_current: fundraise || null,
    fundraise_open: fo || null,
    pre_money_valuation: premoney || null,
    stage_id: Number(stage) || null,
    rating: Number(rating) || null,
    status: Number(status) || null,
    action_id: action,
    contact: uc,
    priority: Number(priority) || null,
    tech_cat,
    sector,
    country,
    invest_note,
    next_step,
    currency,
    user_id: req.user.id,
  }).save();

  const insertContacts = Object.keys(contacts[0]).length === 0 ? [] :
    contacts.map(contact => Contact.forge({
      pipeline_id: pipeline.get('id'),
      people_id: contact,
    }).save());

  let insertNotes = []
  if (notes) {
    insertNotes = notes.map(note => Note.forge({
      text: note,
      ref_id: pipeline.get('id'),
      ref_type: 'pipelines',
      user_id: req.user.id,
    }).save());
  }

  await Promise.all([...insertNotes, ...insertContacts]);
  req.flash('success', pipelineMsg.create_success);
  req.resData = {
    input: {
      ref_id: pipeline.get('id'),
      ref_type: 'pipelines',
      msg: pipelineMsg.create_success,
      redirect: '/pipelines',
    },
    link: '/upload' };
  return next();
};

PipelineController.editView = async (req, res, next) => {
  const getStages = Stage.getAll();
  const getActions = Action.getAll();
  const getRatings = PipelineExtra.getAll({ type: PipelineExtraType.RATING });
  const getStatuses = PipelineExtra.getAll({ type: PipelineExtraType.PIPELINE });
  const getPriorities = PipelineExtra.getAll({ type: PipelineExtraType.PRIORITY });
  const getCurrencies = PipelineExtra.getAll({ type: PipelineExtraType.CURRENCY });
  const getSectors = Sector.getDropdown();
  const pipeline = await Pipeline.get({ id: req.params.id }, ['contacts',
    'company', 'userContact', 'priority', 'country', 'currency', 'techCat',
    { notes: qb => qb.where('deleted_at', null).orderBy('user_id').orderBy('id', 'desc') },
    'notes.createdBy',
    { documents: qb => qb.where('deleted_at', null) },
    'documents.createdBy']);
  if (!pipeline) return next(error('danger', pipelineMsg.not_found, '/pipelines'));
  const [stages, actions, ratings, statuses, sectors, priorities, currencies] = await Promise.all([
    getStages, getActions, getRatings, getStatuses, getSectors, getPriorities, getCurrencies]);
  res.render('pipeline/views/createPipeline', {
    link: '/pipelines',
    type: 'edit',
    ratings: ratings.serialize(),
    statuses: statuses.serialize(),
    stages: stages.serialize(),
    actions: actions.serialize(),
    priorities: priorities.serialize(),
    currencies: currencies.serialize(),
    sectors,
    notes: pipeline.related('notes').serialize(),
    documents: pipeline.related('documents').serialize(),
    pipeline: pipeline.serialize({ techCatId: true }),
  });
};

PipelineController.edit = async (req, res, next) => {
  const { company, stage, fundraise, fund_open: fopen, premoney, rating, contacts, status, action,
    user_contact: uc, priority, tech_cat, sector, country, invest_note, next_step, currency,
    notes = [],
    deletedNote = [],
    deletedDoc = [],
    editedNote = [] } = req.body;
  const pipeline = await Pipeline.get({ id: req.params.id }, ['action']);
  const getUpdateNote = Promise.all([Note.get({ user_id: null, ref_id: req.params.id, ref_type: 'pipelines' }), Action.get({ id: action })]);
  const deleteContacts = Contact.where('pipeline_id', req.params.id).destroy();
  const editPipeline = Pipeline.where({ id: req.params.id }).save({
    company_id: company,
    fundraise_current: fundraise || null,
    fundraise_open: fopen || null,
    pre_money_valuation: premoney || null,
    stage_id: stage,
    rating,
    status,
    action_id: action,
    contact: uc,
    priority,
    tech_cat,
    sector,
    country,
    invest_note,
    next_step,
    currency,
    user_id: req.user.id,
  }, { patch: true });
  // const deleteFiles = [];
  const deleteDocs = deletedDoc.map(doc => Document.softDelete(doc, req.user.id));
  const deleteNotes = deletedNote.map(id => Note.softDelete(id, req.user.id));

  const [updateNote, aksi] = await getUpdateNote;
  // Log action change
  if (!updateNote && String(pipeline.get('action_id')) !== action) {
    notes.push({
      text: `<p>Status updated from ${pipeline.related('action').get('name')} to <b>${aksi.get('name')}</b> on ${formatDate(new Date())} by ${req.user.initial}</p>`,
      updateNote: true,
    });
  } else if (updateNote && String(pipeline.get('action_id')) !== action) {
    editedNote.push({
      id: updateNote.get('id'),
      updateNote: true,
      text: `<p>Status updated from ${pipeline.related('action').get('name')} to <b>${aksi.get('name')}</b> on ${formatDate(new Date())} by ${req.user.initial}</p>${updateNote.get('text')}`,
    });
  }
  const insertNotes = notes.map(note => Note.forge({
    text: note.text || note,
    ref_id: pipeline.get('id'),
    ref_type: 'pipelines',
    user_id: !note.updateNote ? req.user.id : null,
  }).save());
  const editNotes = editedNote.map((note) => {
    if (note.updateNote) return Note.edit(note, null);
    return Note.edit(note, req.user.id);
  });
  await deleteContacts;
  const insertContacts = Object.keys(contacts[0]).length === 0 ? [] :
    contacts.map(contact => Contact.forge({
      pipeline_id: pipeline.get('id'),
      people_id: contact,
    }).save());
  await Promise.all([
    editPipeline,
    ...insertContacts,
    ...insertNotes,
    ...editNotes,
    ...deleteNotes,
    // ...deleteFiles,
    ...deleteDocs]);
  req.resData = {
    input: {
      ref_id: pipeline.get('id'),
      ref_type: 'pipelines',
      msg: pipelineMsg.edit_success,
      redirect: '/pipelines',
    },
    link: '/upload' };
  return next();
};

PipelineController.detail = async (req, res, next) => {
  const pipeline = await Pipeline.get({ id: req.params.id }, [
    'stage', 'contacts', 'company', 'action', 'rating', 'status', 'userContact', 'priority', 'country', 'currency',
    { notes: qb => qb.where('deleted_at', null).orderBy('user_id').orderBy('id', 'desc') },
    'notes.createdBy', 'techCat',
    { documents: qb => qb.where('deleted_at', null) },
    'documents.createdBy']);
  if (!pipeline) return next(error('danger', pipelineMsg.not_found, '/pipelines'));
  res.render('pipeline/views/detailPipeline', {
    link: '/pipelines',
    notes: pipeline.related('notes').serialize(),
    documents: pipeline.related('documents').serialize(),
    pipeline: pipeline.serialize({ formatCurr: true, formatStatus: true }),
  });
};

PipelineController.viewAll = async (req, res) => {
  const { page = 1, companies, pageSize = 10, sort, order,
    founder, tech_cats: techCats = [], user_contact: uc } = req.query;

  const getPipelines = Pipeline.getAll(req.query, { page, pageSize }, ['company', 'action', 'stage', 'createdBy', 'rating', 'status', 'currency', 'priority']);

  const getCompanies = companies
    ? Promise.all(companies.map(id => Company.get({ id }, [], ['id', 'name']))) : [];

  const getStages = Stage.getAll();

  const getActions = Action.getAll();

  const getFounder = !founder ? undefined
    : People.get({ id: founder }).then(result => result.serialize({ api: true }));

    const getRatings = PipelineExtra.getAll({ type: PipelineExtraType.RATING });

  const getStatuses = PipelineExtra.getAll({ type: PipelineExtraType.PIPELINE });

  const getPriorities = PipelineExtra.getAll({ type: PipelineExtraType.PRIORITY });

  const getTechCats = Promise.all(techCats.map(id => Sector.get({ id })
    .then(result => result.serialize({ id: true }))));

    const getSectors = Sector.getDropdown();

  const getContact = !uc ? undefined
    : User.get({ id: uc }).then(result => result.serialize({ api: true }));

    const [pipelines, stages, actions, theCompanies, theFounder,
    ratings, statuses, priorities, theTechCats, sectors, contact] = await Promise
    .all([getPipelines, getStages, getActions, getCompanies, getFounder,
      getRatings, getStatuses, getPriorities, getTechCats, getSectors, getContact]);

  const testTable = pipelines.serialize({ formatStatus: true, formatCurr: true });

  // console.log(testTable)

  res.render('pipeline/views/viewPipelines', {
    link: '/pipelines',
    items: pipelines.serialize({ formatStatus: true, formatCurr: true }),
    title: 'Deal',
    sectors,
    stages: stages.serialize(),
    actions: actions.serialize(),
    ratings: ratings.serialize(),
    statuses: statuses.serialize(),
    priorities: priorities.serialize(),
    companies: theCompanies,
    ...pipelines.pagination,
    tech_cats: theTechCats,
    founder: theFounder,
    queries: req.query,
    sort,
    order,
    contact,
  });
};

PipelineController.export = async (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  const pipelines = await Pipeline.getAll(req.query, { page, pageSize },
    ['stage', 'contacts', 'company', 'action', 'rating', 'status', 'userContact', 'priority', 'country', 'currency', 'createdBy',
      { notes: qb => qb.where('deleted_at', null).orderBy('user_id').orderBy('id', 'desc') },
      { documents: qb => qb.where('deleted_at', null) }]);
  const cols = ['Company', 'Priority', 'Pipeline Status', 'Progress Status', 'Tech Category', 'Sector', 'Country Base', 'Fundraising Stage',
    'Fundraise', 'Fundraise Open', 'Pre-money valuation', 'Rating', 'Founder(s)', 'Contact', 'Created At', 'Edited At', 'Last Edited By', 'Notes', 'Documents'];
  const data = Pipeline.formatExport(pipelines.serialize({ formatCurr: true, forExport: true }));
  const name = `Pipelines Page ${page}`;
  res.attachment(`${name.toLowerCase()}.xlsx`);
  return res.send(genReport(data, cols, name));
};

PipelineController.delete = async (req, res) => {
  const { id } = req.params;
  await Pipeline.where({ id }).save({ deleted_at: new Date() }, { patch: true });
  req.flash('success', pipelineMsg.delete_success);
  return res.redirect('/pipelines');
};
