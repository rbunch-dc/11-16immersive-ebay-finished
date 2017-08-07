export default function(state = null, action){
	switch(action.type){
		case "AUTH":
		case "REGISTER":
			return action.payload;
		default:
			return state;
	}
}
