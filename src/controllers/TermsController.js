import Controller from './Controller'
import pg from 'pg'
import Database from '../database'
import Promise from 'bluebird'
import _http from 'request'
var http = Promise.promisifyAll(_http)
import Lazy from 'lazy.js'

export
default class TermsController extends Controller {
    constructor(router) {
        super(router, '/terms');

        this.get('/', this.index.bind(this));
        this.get('/{id}', this.show.bind(this));
        this.get('/{id}/edit', this.edit.bind(this));
        this.get('/new', this.new);
        this.post('/new', this.create.bind(this));
        this.put('/{id}', this.update.bind(this));
    }

    index(request, reply) {
        var searchTerm = request.url.query['search-term']
        var url = this.absoluteUrl('api/terms?' + (searchTerm ? 'search-term=' + searchTerm : ''))
        http.getAsync(url).then(data => {
            var terms = super.siren(data[0].body)
            if (terms.length === 1)
                reply.redirect('/terms/' + terms[0].id)
            else {
                /**
                 * Sorting is determined based on whether we have a search term.
                 * With no search term, we will sort by `term.term` in ascending order.
                 * With a search term, we will sort by `term.rank` in descending order.
                 * This latter behavior is because higher ranking-values indicate
                 * closer matches to the search term.
                 */
                var terms = Lazy(terms).sortBy(term => !searchTerm ? term.term : term.rank, !searchTerm ? false : true)
                    .map(t => {
                        t.tags = t.tags.join(' ')
                        return t
                    }).toArray()
                var title = searchTerm == null ? 'Terms' : 'Search results for: ' + searchTerm;
                reply.view('terms/index', {
                    searchTerm: searchTerm || '*',
                    title: title,
                    terms: terms
                })
            }
        })
    }

    create(request, reply) {
        var url = this.absoluteUrl('api/terms/new')
        http.postAsync({
            url: url,
            form: request.payload
        }).then(data => {
            var term = super.siren(data[0].body)
            reply.redirect('/terms/' + term.id);
        })
    }

    edit(request, reply) {
        this._show(request.params.id).then(term => {
            reply.view('terms/edit', {
                title: 'Edit term',
                term: term
            })
        })
    }

    show(request, reply) {
        this._show(request.params.id).then(term =>
            reply.view('terms/show', {
                title: 'Show term',
                term: term
            }))
    }

    _show(id) {
        var url = this.absoluteUrl('api/terms/' + id)
        return http.getAsync(url).then(data => {
            var term = super.siren(data[0].body)
            term.tags = term.tags.join(' ')
            return term
        })
    }

    new(request, reply) {
        reply.view('terms/new', {
            title: 'New term',
            term: request.query.term
        });
    }

    update(request, reply) {
        var id = request.params.id
        var url = this.absoluteUrl('api/terms/' + id)
        http
            .putAsync({
                url: url,
                form: request.payload
            })
            .then(() => reply.redirect('/terms/' + id))
    }
}
