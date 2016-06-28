#Switchboard.js


An Inter Process Communication Protocol for node. 

Allow to communicate between process using a  configuration file saying for what things need permission.

This is still on development and the readme will be improved soon

this is the documentation for the protocol, there is not need of understand that for use library

 	{
		action: 'request' //see possible action values,
		token: 'xx-yy-zz' //the authentication token
		from: 'com.namepasce.worker' // from where the message come
		to: 'com.namepasce.provider' //where the message go,
		uid: //unique id to identify the message,
		//for error handler
		error: { 
			code:000,
			message:''
		},
		//si se llama un metodo de parte del worker hacia el provider este debe de ser el objeto a enviar
		// the method to request
		methods: { 
			name: '' //method name,
			params:{a:2,b:2} //parameters to call
		},
		data: {}//data send from the provider when a method is called
		consume: {} //the list of consumes
	}	

####Possible values for action are:

 - Register: As a provider request a registration 
 - Consume: As consumer, request the object to consume
 - Validate: to request a token validation
 - Response: for response to any message send
 - Provide: for response to the consumer when request methods
 - Request: for consume methods to a provider
 - Event: for sending events data



 For more detail please see the example folder, this documentation will be improve soon.