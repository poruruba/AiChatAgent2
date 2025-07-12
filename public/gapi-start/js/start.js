'use strict';

//const vConsole = new VConsole();
//const remoteConsole = new RemoteConsole("http://[remote server]/logio-post");
//window.datgui = new dat.GUI();

var new_win;

var vue_options = {
    el: "#top",
    mixins: [mixins_bootstrap],
    store: vue_store,
    router: vue_router,
    data: {
        apikey: "",
        state: "",
        token: {},
        access_type: "offline",
        prompt: true,
        client_id: "",
        redirect_url: "",
    },
    computed: {
    },
    methods: {
        do_token: async function(qs){
            console.log(qs);
            if( qs.state != this.state ){
                console.error("state mismatch");
                alert('state mismatch');
                return;
            }

            try{
                var input = {
                    url: "/gapi/token",
                    method: "POST",
                    body: {
                        code: qs.code,
                    },
                    api_key: this.apikey
                };
                var result = await do_http(input);
                console.log(result);

                this.token = result;

                this.dialog_open("#view_token_dialog");
            }catch(error){
                console.error(error);
                alert(error);
            }
        },

        start_token_refresh: async function(){
            try{
                var input = {
                    url: "/gapi/token-refresh",
                    method: "POST",
                    api_key: this.apikey
                };
                var result = await do_http(input);
                console.log(result);

                this.token = result;

                this.dialog_open("#view_token_dialog");
            }catch(error){
                console.error(error);
                alert(error);
            }
        },
        start_authorize: async function(){
            this.state = randomString(16);

            var params = {
                state: this.state,
                access_type: this.access_type,
                prompt: this.prompt ? "consent" : ""
            };
            new_win = open('/gapi-login' + '?' + to_urlparam(params), null, 'width=400,height=750');
        },
    },
    created: function(){
    },
    mounted: async function(){
        proc_load();

        var result = await do_get('/sites');
        this.site_list = result.list;

        var result = await do_get('/gapi/client_info');
        this.client_id = result.client_id;
        this.redirect_url = result.redirect_url;
    }
};
vue_add_data(vue_options, { progress_title: '' }); // for progress-dialog
vue_add_global_components(components_bootstrap);
vue_add_global_components(components_utils);

/* add additional components */
  
window.vue = new Vue( vue_options );

function to_urlparam(qs){
  var params = new URLSearchParams();
  for( var key in qs )
      params.set(key, qs[key] );
  return params.toString();
}

function randomString(length) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

