{
	action: 'request' //ver posibles valores de action,
	token: 'xx-yy-zz' //el authentication token de este worker
	from: 'com.namepasce.worker' // desde donde veine el namepasce,
	to: 'com.namepasce.provider' //hacia donde va el mensaje,
	uid: //valor unique identifica este mensaje,
	error: { //objecto de error en caso de que pase
		code:000,
		message:''
	},
	methods: { //si se llama un metodo de parte del worker hacia el provider este debe de ser el objeto a enviar
		name: '' //el nombre del metodo a llamar,
		params:{a:2,b:2} //parametros a llamar
	},
	data: {}//datos de respuesta de parte del proveedor cuando se llame un metodo,
	consume: {} //en caso de que se quiera consumir algo
}
//Posible valores de action
Register -> Para solicitud de registro de parte del provider
Consume -> Para solicitude del objecto de consumo de parte del consumer
Validate -> Para solicitar validar un token al server
Response -> para dar respuestas desde el server y desde el provider
Provide -> para responder el objecto de consumo pedido al provider
Request -> Para consumir metodos a un provider
Event -> para manejar eventos