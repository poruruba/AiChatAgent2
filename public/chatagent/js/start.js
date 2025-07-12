'use strict';

//const vConsole = new VConsole();
//const remoteConsole = new RemoteConsole("http://[remote server]/logio-post");
//window.datgui = new dat.GUI();

const base_url = "";

var vue_options = {
    el: "#top",
    mixins: [mixins_bootstrap],
    store: vue_store,
    router: vue_router,
    data: {
        message_list: [],
        thread_message_list: [],
        input_message: "",
        input_apikey: "",
        thread_list: [],
        threadId: 0,
        mode: "current",
        thread: "",
        tool_list: [],
    },
    computed: {
    },
    methods: {
        apikey_config_open: function(){
            this.input_apikey = this.apikey;
            this.dialog_open("#apikey_config_dialog");
        },
        apikey_config_save: function(){
            localStorage.setItem("chatagent_apikey", this.input_apikey);
            this.apikey = this.input_apikey;
            this.dialog_close("#apikey_config_dialog");
        },
        show_tools: async function(){
            var input = {
                url: base_url + "/mastra-list-tools",
                api_key: this.apikey
            };
            var response = await do_http(input);
            console.log(response);

            this.tool_list = response.list;

            this.dialog_open("#show_tools_dialog");
        },
        start_new_thread: async function(){
            var input = {
                url: base_url + "/mastra-new-thread",
                api_key: this.apikey
            };
            var response = await do_http(input);
            console.log(response);

            this.mode = "current";
            this.thread = "";
            this.message_list = [];
            this.thread_message_list = [];

            await this.update_thread_list();
        },
        start_delete_all_thread: async function(){
            if( !confirm("本当に削除しますか？") )
                return;

            try{
                var input = {
                    url: base_url + "/mastra-delete-all-thread",
                    api_key: this.apikey
                };
                var response = await do_http(input);
                console.log(response);

                await this.start_new_thread();
            }catch(error){
                console.error(error);
                alert(error);
            }
        },
        select_thread: async function(){
            if( this.thread == "" ){
                this.mode = "current";
            }else{
                try{
                    var input = {
                        url: base_url + "/mastra-query-thread",
                        body: {
                            id: this.thread.id
                        },
                        api_key: this.apikey
                    };
                    var response = await do_http(input);
                    console.log(response);

                    var list = [];
                    var input, output, datetime;
                    var thread_list = [];
                    for( var i = 0 ; i < response.thread.length ; i++ ){
                        var message = response.thread[i];
                        if( message.role == "user" ){
                            if( thread_list.length > 0 ){
                                list.unshift({
                                    datetime: datetime,
                                    input: input,
                                    thread_list: thread_list
                                });
                            }
                            datetime = new Date(message.createdAt).getTime();
                            input = message.content;
                            thread_list = [message];
                        }else if( message.role == "assistant" && message.type == 'text' ){
                            output = message.content[0].text;
                            thread_list.push(message);
                            list.unshift({
                                datetime: datetime,
                                input: input,
                                output: output,
                                thread_list: thread_list
                            });
                            datetime = 0;
                            input = null;
                            output = null;
                            thread_list = [];
                        }else{
                            thread_list.push(message);
                        }
                    }
                    this.thread_message_list = list;

                    this.mode = "thread";
                }catch(error){
                    console.error(error);
                    alert(error);
                }
            }
        },
        send_message: async function(){
            try{
                this.mode = "current";
                this.thread = "";
                var message = {
                    datetime: new Date().getTime(),
                    input: this.input_message,
                    inProgress: true,
                };
                this.message_list.unshift(message);

                var input = {
                    url: base_url + "/mastra-generate",
                    body: {
                        message: message.input
                    },
                    api_key: this.apikey
                };
                var response = await do_http(input);
                console.log(response);

                message.output = response.message;
                this.input_message = "";

                if( this.threadId != response.threadId )
                    await this.update_thread_list();
            }catch(error){
                console.error(error);
                alert(error);
            }finally{
                message.inProgress = false;
            }
        },
        update_thread_list: async function(){
            try{
                var input = {
                    url: base_url + "/mastra-get-thread-list",
                    api_key: this.apikey
                };
                var response = await do_http(input);
                console.log(response);

                this.thread_list = response.list;
            }catch(error){
                console.error(error);
                alert(error);
            }
        },
    },
    created: function(){
    },
    mounted: async function(){
        proc_load();

        this.apikey = localStorage.getItem("chatagent_apikey");
        await this.start_new_thread();
    }
};
vue_add_data(vue_options, { progress_title: '' }); // for progress-dialog
vue_add_global_components(components_bootstrap);
vue_add_global_components(components_utils);

/* add additional components */
  
window.vue = new Vue( vue_options );
