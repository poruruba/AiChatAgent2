'use strict';

//const vConsole = new VConsole();
//window.datgui = new dat.GUI();

var vue_options = {
    el: "#top",
    mixins: [mixins_bootstrap],
    data: {
        message: '',
    },
    computed: {
    },
    methods: {
        do_login: function (state, prompt, access_type) {
            var qs = {
                state: state,
                access_type: access_type,
            };
            if( prompt )
                qs.prompt = prompt;
            window.location = "/gapi/authorize?" + to_urlparam(qs);
        }
    },
    created: function(){
    },
    mounted: function(){
        proc_load();

        if( searchs.code ){
            var qs = {
                code: searchs.code,
                state: searchs.state
            };
            window.opener.vue.do_token(qs);
            window.close();
        }else{
            this.do_login(searchs.state, searchs.prompt, searchs.access_type);
        }
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
