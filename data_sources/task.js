// ==========================================================================
// Project:   Todos.TaskDataSource
// Copyright: ©2010 My Company, Inc.
// ==========================================================================
/*globals Todos */


Todos.TASKS_QUERY = SC.Query.local(Todos.Task, {
  // orderBy: 'isDone, description'
});

/** @class

  (Document Your Data Source Here)

  @extends SC.DataSource
*/
Todos.TaskDataSource = SC.DataSource.extend(
/** @scope Todos.TaskDataSource.prototype */
{

  _dbpath: 'todos',

  getServerPath: function(resourceName) {
    var path = '/' + this._dbpath + "//" + resourceName;  //Estará bien el "//"?
    //console.log('ServerPath=', path);
    return path;

  },

  getServerView: function(viewName) {
    var path = '/' + this._dbpath + "/_design/app/_view/" + viewName;
    //console.log('ServerView=', path);
    return path;

  },

  // ..........................................................
  // QUERY SUPPORT
  // 
  fetch: function(store, query) {

    if (query === Todos.TASKS_QUERY) {
      SC.Request.getUrl(this.getServerView('allTasks'))
      					.json()
      					.header('Accept', 'application/json')
      					.notify(this, 'didFetchTasks', store, query)
      					.send();
			
			// var getAll = SC.Request.create({
			// 	type: 'GET',
			// 	address: this.getServerView('allTasks'),
			// 	isJSON: YES,
			// 	headers: ['Accept', 'application/json']
			// });
			// 
			// getAll.notify(this, 'didFetchTasks', {
			// 	store: store, 
			// 	query: query
			// });
			// // getAll.json();
			// getAll.send();
									
      return YES;
    }

    return NO; // return YES if you handled the query
  },

  didFetchTasks: function(response, store, query) {
    if (SC.ok(response)) {
      var body = response.get('encodedBody');
			console.log("body=", body);
      var couchResponse = SC.json.decode(body);
			console.log("couchReponse=", couchResponse );
      var records = couchResponse.rows.getEach('value');
			console.log("records=", records);
      store.loadRecords(Todos.Task, records);
      store.dataSourceDidFetchQuery(query);
    } 
		else {
      store.dataSourceDidErrorQuery(query, response);
    }
  },

  // ..........................................................
  // RECORD SUPPORT
  // 
  retrieveRecord: function(store, storeKey) {

    if (SC.kindOf(store.recordTypeFor(storeKey), Todos.Task)) {
      var id = store.idFor(storeKey);
      SC.Request.getUrl(this.getServerPath(id))
								.header('Accept', 'application/json')
								.json()
								.notify(this, 'didRetrieveTask', store, storeKey)
								.send();

      return YES;
    }

    return NO; // return YES if you handled the storeKey
  },

  didRetrieveTask: function(response, store, storeKey) {
    if (SC.ok(response)) {
      var dataHash = response.get('body').content;
      store.dataSourceDidComplete(storeKey, dataHash);

    } else store.dataSourceDidError(storeKey, response);
  },


	// 
	// === PROCESS RESPONSE FOR CREATE, UPDATE, DELETE ===
	// 
  /**
  Process response from CouchDB of create, update, delete operations.

  @returns id,rev for success, null for failure.
  */
  processResponse: function(response) {
		//console.log('processResponse-response=', response);
    if (SC.ok(response)) {
      var body = response.get('encodedBody');
			console.log('processResponse-body=', body);
      var couchResponse = SC.json.decode(body);
			console.log('processResponse-couchResponse=', couchResponse.toString());
      var ok = couchResponse.ok;
      if (ok != YES) return {
        "error": true,
        "response": couchResponse
      };

      var id = couchResponse.id;
      var rev = couchResponse.rev;
      return {
        "ok": true,
        "id": id,
        "rev": rev
      };
    } else {
      return {
        "error": true,
        "response": response
      };
    }
  },

  /**
  Get the latest revision of the document.
  For docs which were fetch from the server we use _rev field,
  and for docs that were modified we use the local _docsRev dictionary.
  */
  getDocRev: function(doc) {
    return doc._rev;
  },




	// === CREATE (POST) ===

  createRecord: function(store, storeKey) {
		console.log('>>> createRecord triggered');
    if (SC.kindOf(store.recordTypeFor(storeKey), Todos.Task)) {
      // SC.Request.postUrl(this.getServerPath('/')).json().header('Accept', 'application/json').notify(this, this.didCreateTask, store, storeKey).send(store.readDataHash(storeKey));
			SC.Request.postUrl(this.getServerPath('/'))
								.json()
								.header('Accept', 'application/json')
								.notify(this, this.didCreateTask, store, storeKey)
								.send(store.readDataHash(storeKey));
      return YES;
    }

    return NO; // return YES if you handled the storeKey
  },

  didCreateTask: function(response, store, storeKey) {
    var couchRes = this.processResponse(response);
		console.log('Create-couchRes=', couchRes)
    if (couchRes.ok) {
      // Add _id and _rev to the local document for further server interaction.
      var localDoc = store.readDataHash(storeKey);
      localDoc._id = couchRes.id;
      localDoc._rev = couchRes.rev;

			console.log('Create-arg1:storeKey=', storeKey);
			console.log('Create-arg2:localDoc=', localDoc);
			console.log('Create-arg3:couchRes.id=', couchRes.id);
			
      store.dataSourceDidComplete(storeKey, localDoc, couchRes.id);

			//console.log(store.find(Todos.Task, storeKey).toString());
			
    } else {
      store.dataSourceDidError(storeKey, response);
    }
  },



	// === UPDATE (PUT, PATCH) ===

  updateRecord: function(store, storeKey) {
		console.log('>>> UPDATE RECORD TRIGGERED <<<');
		console.log('Update-Record Status=', store.readStatus(storeKey));
		console.log("Update-BEFORE.Record-status=", store.find(Todos.Task, store.idFor(storeKey)).toString());
		
    //console.log('Update-store.recordTypeFor(storeKey)=', store.recordTypeFor(storeKey));
		//console.log('Update-SC.kindOf(store.recordTypeFor(storeKey), Todos.Task)', SC.kindOf(store.recordTypeFor(storeKey), Todos.Task));
		
		if (SC.kindOf(store.recordTypeFor(storeKey), Todos.Task)) {
      var id = store.idFor(storeKey);
			//console.log("Update-id=", id);
			
      var dataHash = store.readDataHash(storeKey);
			console.log("Update-rev=", this.getDocRev(dataHash));
			console.log("Update-dataHash=", dataHash);
			
			
			var status=store.readStatus(storeKey);
			console.log('Update-Record Status=', status);
			
      // SC.Request.putUrl(this.getServerPath(id)).json().header('Accept', 'application/json').notify(this, this.didUpdateTask, store, storeKey).send(dataHash);
			
			//console.log("Update-this.getServerPath(id)", this.getServerPath(id));
			console.log("+++ Just BEFORE sending the request ++++ ");
			SC.Request.putUrl(this.getServerPath(id))
								.json()
								.header('Accept', 'application/json')
								.notify(this, this.didUpdateTask, store, storeKey)
								.send(dataHash);
								
			console.log("+++ Just AFTER sending the request ++++ ");
								
      return YES;
    }
    return NO;
  },

  didUpdateTask: function(response, store, storeKey) {
    var couchRes = this.processResponse(response);
		console.log("Update-couchRes=", couchRes);
		var results = response.get('body');
		console.log("Update-results = response.get('body')=", results);
    if (couchRes.ok) {
      // Update the local _rev of this document.
      var localDoc = store.readDataHash(storeKey);
			var status=store.readStatus(storeKey);
				
			localDoc._id = couchRes.id;  // puesto por mi
      localDoc._rev = couchRes.rev;

			console.log('Update-Record Status=', status);
			console.log('Update-arg1:storeKey=', storeKey);
			console.log('Update-arg2:localDoc=dataHash=', localDoc);
			
			store.dataSourceDidComplete(storeKey, localDoc);
			// store.dataHashDidChange(storeKey);
			// store.flush();
			
			console.log('Update-Record Status AFTER store.dataSourceDidComplete=', status);
			console.log("Update-AFTER.Record-status==", store.find(Todos.Task, localDoc._id).toString());
			
    } else {
      store.dataSourceDidError(storeKey);
    }
  },



	// === DELETE ===

  destroyRecord: function(store, storeKey) {
		console.log('>>> destroyRecord triggered')
		
    if (SC.kindOf(store.recordTypeFor(storeKey), Todos.Task)) {
      var id = store.idFor(storeKey);
      //var rev = this._docsRev[id];	
      var dataHash = store.readDataHash(storeKey);
      var rev = this.getDocRev(dataHash);
      SC.Request.deleteUrl(this.getServerPath(id + "?rev=" + rev))
								.json()
								.header('Accept', 'application/json')
								.notify(this, this.didDeleteTask, store, storeKey)
								.send();
								
      return YES;
    }

    return NO; // return YES if you handled the storeKey
  },

  didDeleteTask: function(response, store, storeKey) {
    var couchRes = this.processResponse(response);
		console.log('Delete-couchRes=', couchRes);
    if (couchRes.ok) {
			console.log('Delete-arg1:storeKey=', storeKey);
			
      store.dataSourceDidDestroy(storeKey);
    } else {
      store.dataSourceDidError(response);
    }
  }

});



