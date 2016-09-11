(function(exports) {
  "use strict";

  if (!exports.Indigo) exports.Indigo = {};
  Indigo = exports.Indigo;

  // The SourceEditorController manages the interaction between
  // the model, the document editor view, and the source (xml) and
  // text editor components.
  Indigo.SourceEditorController = function(options) {
    this.initialize.apply(this, arguments);
  };
  _.extend(Indigo.SourceEditorController.prototype, Backbone.Events, {
    initialize: function(options) {
      var self = this;

      this.view = options.view;
      this.name = 'source';
      this.grammar_fragments = {
        chapter: 'chapters',
        part: 'parts',
        section: 'sections',
        component: 'schedules',
        components: 'schedules_container',
      };

      // setup renderer
      var htmlTransform = new XSLTProcessor();
      $.get('/static/xsl/act.xsl')
        .then(function(xml) {
          htmlTransform.importStylesheet(xml);
          self.htmlTransform = htmlTransform;
        });

      // setup xml editor
      this.xmlEditor = ace.edit(this.view.$el.find(".document-xml-editor .ace-editor")[0]);
      this.xmlEditor.setTheme("ace/theme/monokai");
      this.xmlEditor.getSession().setMode("ace/mode/xml");
      this.xmlEditor.setValue();
      this.xmlEditor.$blockScrolling = Infinity;
      this.onEditorChange = _.debounce(_.bind(this.xmlEditorChanged, this), 500);

      // setup text editor
      this.$textEditor = this.view.$el.find('.document-text-editor');
      this.textEditor = ace.edit(this.view.$el.find(".document-text-editor .ace-editor")[0]);
      this.textEditor.setTheme("ace/theme/chrome");
      this.textEditor.getSession().setMode("ace/mode/text");
      this.textEditor.setValue();
      this.textEditor.getSession().setUseWrapMode(true);
      this.textEditor.setShowPrintMargin(false);
      this.textEditor.$blockScrolling = Infinity;

      this.view.$el.find('.text-editor-buttons .btn.save').on('click', _.bind(this.saveTextEditor, this));
      this.view.$el.find('.text-editor-buttons .btn.cancel').on('click', _.bind(this.closeTextEditor, this));
      this.view.$el.find('.btn.edit-text').on('click', _.bind(this.editText, this));

      var textTransform = new XSLTProcessor();
      $.get('/static/xsl/act_text.xsl')
        .then(function(xml) {
          textTransform.importStylesheet(xml);
          self.textTransform = textTransform;
        });
    },

    editText: function(e) {
      e.preventDefault();

      // disable the edit button
      this.view.$el.find('.btn.edit-text').prop('disabled', true);

      // ensure source code is hidden
      this.view.$el.find('.btn.show-source.active').click();

      var self = this;
      var $editable = this.view.$el.find('.akoma-ntoso').children().first();
      // text from node in the actual XML document
      var text = this.xmlToText(this.view.fragment);

      // show the text editor
      this.view.$el
        .find('.document-content-view, .document-content-header')
        .addClass('show-text-editor')
        .find('.toggle-editor-buttons .btn')
        .prop('disabled', true);

      this.$textEditor
        .data('fragment', this.view.fragment.tagName)
        .show();

      this.textEditor.setValue(text);
      this.textEditor.gotoLine(1, 0);
      this.textEditor.focus();

      this.view.$el.find('.document-sheet-container').scrollTop(0);
    },

    xmlToText: function(element) {
      return this.textTransform
        .transformToFragment(element, document)
        .firstChild.textContent
        // cleanup inline whitespace
        .replace(/([^ ]) +/g, '$1 ')
        // remove multiple consecutive blank lines
        .replace(/^( *\n){2,}/gm, "\n");
    },

    saveTextEditor: function(e) {
      var self = this;
      var $editable = this.view.$el.find('.akoma-ntoso').children().first();
      var $btn = this.view.$el.find('.text-editor-buttons .btn.save');
      var content = this.textEditor.getValue();
      var fragment = this.$textEditor.data('fragment');
      fragment = this.grammar_fragments[fragment] || fragment;

      // should we delete the item?
      if (!content.trim() && fragment != 'akomaNtoso') {
        if (confirm('Go ahead and delete this section from the document?')) {
          this.view.removeFragment();
        }
        return;
      }

      $btn
        .attr('disabled', true)
        .find('.fa')
          .removeClass('fa-check')
          .addClass('fa-spinner fa-pulse');

      // The actual response to update the view is done
      // in a deferred so that we can cancel it if the
      // user clicks 'cancel'
      var deferred = this.pendingTextSave = $.Deferred();
      deferred
        .then(function(response) {
          var newFragment = $.parseXML(response.output);

          if (fragment === 'akomaNtoso') {
            // entire document
            newFragment = [newFragment];
          } else {
            newFragment = newFragment.documentElement.children;
          }

          self.view.updateFragment(self.view.fragment, newFragment);
          self.closeTextEditor();
          self.render();
          self.setXmlEditorValue(Indigo.toXml(newFragment[0]));
        })
        .fail(function(xhr, status, error) {
          // this will be null if we've been cancelled without an ajax response
          if (xhr) {
            if (xhr.status == 400) {
              Indigo.errorView.show(xhr.responseJSON.content || error || status);
            } else {
              Indigo.errorView.show(error || status);
            }
          }
        })
        .always(function() {
          // TODO: this doesn't feel like it's in the right place;
          $btn
            .attr('disabled', false)
            .find('.fa')
              .removeClass('fa-spinner fa-pulse')
              .addClass('fa-check');
        });

      var data = {
        'inputformat': 'text/plain',
        'outputformat': 'application/xml',
        'content': content,
      };
      if (fragment != 'akomaNtoso') {
        data.fragment = fragment;
      }

      $.ajax({
        url: '/api/convert',
        type: "POST",
        data: JSON.stringify(data),
        contentType: "application/json; charset=utf-8",
        dataType: "json"})
        .done(function(response) {
          deferred.resolve(response);
        })
        .fail(function(xhr, status, error) {
          deferred.reject(xhr, status, error);
        });
    },

    closeTextEditor: function(e) {
      if (this.pendingTextSave) {
        this.pendingTextSave.reject();
        this.pendingTextSave = null;
      }
      this.view.$el
        .find('.document-content-view, .document-content-header')
        .removeClass('show-text-editor')
        .find('.toggle-editor-buttons .btn')
        .prop('disabled', false);
    },

    editFragment: function(node) {
      // edit node, a node in the XML document
      this.closeTextEditor();
      this.render();
      this.view.$el.find('.document-sheet-container').scrollTop(0);

      this.setXmlEditorValue(Indigo.toXml(node));
    },

    setXmlEditorValue: function(xml) {
      // pretty-print the xml
      xml = prettyPrintXml(xml);

      this.xmlEditor.removeListener('change', this.onEditorChange);
      this.xmlEditor.setValue(xml);
      this.xmlEditor.on('change', this.onEditorChange);
    },

    xmlEditorChanged: function() {
      // save the contents of the XML editor
      console.log('Parsing changes to XML');

      // TODO: handle errors here
      var newFragment = $.parseXML(this.xmlEditor.getValue()).documentElement;

      this.view.updateFragment(this.view.fragment, [newFragment]);
      this.render();
    },

    // Save the content of the XML editor into the DOM, returns a Deferred
    saveChanges: function() {
      this.closeTextEditor();
      return $.Deferred().resolve();
    },

    render: function() {
      if (this.htmlTransform && this.view.fragment) {
        var html = this.htmlTransform.transformToFragment(this.view.fragment, document);
        this.view.$el.find('.akoma-ntoso').html('').get(0).appendChild(html);
      }
    },

    resize: function() {},
  });

  // The LimeEditorController manages the interaction between
  // the LIME-based editor, the model, and the document editor view.
  Indigo.LimeEditorController = function(options) {
    this.initialize.apply(this, arguments);
  };
  _.extend(Indigo.LimeEditorController.prototype, Backbone.Events, {
    initialize: function(options) {
      this.view = options.view;
      this.initialized = false;
      this.name = 'lime';
    },

    editFragment: function(node) {
      var self = this;

      if (typeof(LIME) == 'undefined') {
        // we load LIME asynchronously when it's first needed,
        // and we need a callback to know when that's done
        $(document).on('ext:loaded', function() {
          Ext.onReady(function() {
            self.editFragmentWithLime(node);
          });
        });

        // load the LIME script, this will eventually trigger the 'lime-loaded' event
        _.each(LIME_bootstrap_scripts, function(fname) {
          var script = document.createElement('script');
          script.src = fname;
          document.body.appendChild(script);
        });

      } else {
        // LIME already loaded, go ahead and edit
        this.editFragmentWithLime(node);
      }
    },

    editFragmentWithLime: function(node) {
      // if we're editing the entire document,
      // strip the metadata when we next edit the 
      this.stripMeta = !node.querySelector('meta');
      this.fragmentType = node.tagName;
      this.editing = true;

      this.resize();

      var config = {
        docMarkingLanguage: "akoma2.0",
        docType: "act",
        docLocale: this.view.model.get('country'),
        docLang: "eng",
      };

      if (!this.initialized) {
        // We only want to interact with the editor once the document
        // is fully loaded, which we get as a callback from the
        // application. We only setup this event handler once.
        LIME.app.on('documentLoaded', this.documentLoaded, this);
        this.initialized = true;
      }

      this.loading = true;
      LIME.XsltTransforms.transform(
        node,
        LIME_base_url + 'languagesPlugins/akoma2.0/AknToXhtml.xsl',
        {},
        function(html) {
          config.docText = html.firstChild.outerHTML;
          LIME.app.fireEvent("loadDocument", config);
        }
      );

      Indigo.ga('send', 'event', 'edit-with-lime', this.fragmentType);
    },

    documentLoaded: function() {
      // document has loaded
      this.loading = false;
    },

    // Save the content of the LIME editor into the DOM, returns a Deferred
    updateFromLime: function() {
      var self = this;
      var start = new Date().getTime();
      var oldFragment = this.view.fragment;
      var deferred = $.Deferred();

      console.log('Updating XML from LIME');

      LIME.app.fireEvent("translateRequest", function(xml) {
        var stop = new Date().getTime();
        console.log('Got XML from LIME in ' + (stop-start) + ' msecs');

        // reset the changed flag
        LIME.app.getController('Editor').changed = false;

        if (self.stripMeta) {
          // We're editing just a fragment.
          // LIME inserts a meta element which we need to strip.
          var meta = xml.querySelector('meta');
          if (meta) {
            meta.remove();
          }
        }

        // LIME wraps the document in some extra stuff, just find the
        // item we started with
        xml = xml.querySelector(self.fragmentType);
        self.view.updateFragment(oldFragment, [xml]);

        deferred.resolve();
      }, {
        serialize: false,
      });

      return deferred;
    },

    // Save the content of the LIME editor into the DOM, returns a Deferred
    saveChanges: function() {
      if (!this.loading) {
        return this.updateFromLime();
      } else {
        return $.Deferred().resolve();
      }
    },

    resize: function() {
      LIME.app.resize();
    },
  });


  // Handle the document editor, tracking changes and saving it back to the server.
  // The model is an Indigo.DocumentContent instance.
  Indigo.DocumentEditorView = Backbone.View.extend({
    el: '#content-tab',
    events: {
      'click .btn.edit-lime': 'toggleLime',
      'click .btn.show-fullscreen': 'toggleFullscreen',
      'click .btn.show-source': 'toggleShowCode',
    },

    initialize: function(options) {
      this.dirty = false;
      this.editing = false;

      this.documentContent = options.documentContent;
      // XXX: check
      this.documentContent.on('change', this.setDirty, this);
      this.documentContent.on('sync', this.setClean, this);

      this.tocView = options.tocView;
      this.tocView.on('item-selected', this.editTocItem, this);

      // setup the editor controllers
      this.sourceEditor = new Indigo.SourceEditorController({view: this});
      this.limeEditor = new Indigo.LimeEditorController({view: this});

      this.showDocumentSheet();
    },

    editTocItem: function(item) {
      var self = this;
      this.stopEditing()
        .then(function() {
          if (item) {
            self.$el.find('.boxed-group-header h4').text(item.title);
            self.editFragment(item.element);
          }
        });
    },

    stopEditing: function() {
      if (this.activeEditor && this.editing) {
        this.editing = false;
        return this.activeEditor.saveChanges();
      } else {
        this.editing = false;
        return $.Deferred().resolve();
      }
    },

    editFragment: function(fragment) {
      if (!this.updating && fragment) {
        console.log("Editing new fragment");
        this.editing = true;
        this.fragment = fragment;
        this.activeEditor.editFragment(fragment);
      }
    },

    toggleFullscreen: function(e) {
      this.$el.toggleClass('fullscreen');
      this.activeEditor.resize();
    },

    toggleShowCode: function(e) {
      if (this.activeEditor.name == 'source') {
        this.$el.find('.document-content-view').toggleClass('show-source');
      }
    },

    removeFragment: function() {
      this.documentContent.replaceNode(this.fragment, null);
    },

    updateFragment: function(oldNode, newNodes) {
      this.updating = true;
      try {
        this.fragment = this.documentContent.replaceNode(oldNode, newNodes);
      } finally {
        this.updating = false;
      }
    },

    showDocumentSheet: function() {
      var self = this;

      this.stopEditing()
        .then(function() {
          self.$el.find('.sheet-editor').addClass('in');
          self.$el.find('.lime-editor').removeClass('in');
          self.$el.find('.btn.show-source, .btn.edit-text').prop('disabled', false);
          self.$el.find('.btn.edit-text').addClass('btn-warning').removeClass('btn-default');
          self.$el.find('.btn.edit-lime').addClass('btn-default').removeClass('btn-warning active');
          self.activeEditor = self.sourceEditor;
          self.editFragment(self.fragment);
        });
    },

    toggleLime: function(e) {
      if (this.activeEditor === this.limeEditor) {
        // stop editing in lime
        e.preventDefault();
        this.showDocumentSheet(e);
        return;
      }

      var self = this;

      this.stopEditing()
        .then(function() {
          self.$el.find('.sheet-editor').removeClass('in');
          self.$el.find('.lime-editor').addClass('in');
          self.$el.find('.btn.show-source, .btn.edit-text').prop('disabled', true);
          self.$el.find('.btn.edit-text').addClass('btn-default').removeClass('btn-warning active');
          self.$el.find('.btn.edit-lime').addClass('btn-default active').removeClass('btn-default');
          self.activeEditor = self.limeEditor;
          self.editFragment(self.fragment);
        });
    },

    setDirty: function() {
      if (!this.dirty) {
        this.dirty = true;
        this.trigger('dirty');
      }
    },

    setClean: function() {
      if (this.dirty) {
        this.dirty = false;
        this.trigger('clean');
      }
    },

    // Save the content of the editor, returns a Deferred
    save: function() {
      var self = this;

      // don't do anything if it hasn't changed
      if (!this.dirty) {
        return $.Deferred().resolve();
      }

      if (this.activeEditor) {
        return this.activeEditor
          // ask the editor to returns its contents
          .saveChanges()
          .then(function() {
            // save the model
            return self.saveModel();
          });
      } else {
        return this.saveModel();
      }
    },

    // Save the content of the document, returns a Deferred
    saveModel: function() {
      return this.documentContent.save();
    },
  });
})(window);
